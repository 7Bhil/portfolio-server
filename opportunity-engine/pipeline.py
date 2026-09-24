import os
import sys
import time
import uuid
import logging
import requests
from datetime import datetime, timezone

from config.settings import (
    BACKEND_URL, JOB_TYPE, DRY_RUN, MIN_SCORE_FOR_AI, CIRCUIT_BREAKER_MAX_FAILURES
)
from database.connection import get_db_connection
from database.models import (
    log_system, create_pipeline_run, finalize_pipeline_run,
    get_or_create_source, update_source_status, get_or_create_company,
    opportunity_exists, insert_opportunity
)
from services.deduplication import build_dedupe_key
from services.scoring import calculate_opportunity_score
from services.contacts import extract_contact_from_text
from services.messages import generate_opportunity_message
from services.alerts import send_system_alert

# Adaptateurs de sources
from sources.remotive import RemotiveSource
from sources.jobicy import JobicySource
from sources.weworkremotely import WeWorkRemotelySource
from sources.himalayas import HimalayasSource
from sources.remoteok import RemoteOKSource
from sources.company_sites import CompanySitesSource

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("opportunity-engine")

def run_health_check(run_id: str) -> bool:
    """
    Exécute le health check préventif.
    1. Tente de joindre le backend Render (/ready).
    2. En cas d'échec Render (cold start prolongé ou veille), teste directement la base Neon PostgreSQL.
    """
    url = f"{BACKEND_URL.rstrip('/')}/ready"
    max_retries = 1
    timeout_sec = 15
    pause_sec = 10

    logger.info(f"Démarrage du health check sur {url}...")
    for attempt in range(1, max_retries + 2):
        try:
            logger.info(f"Tentative {attempt}/{max_retries + 1}...")
            res = requests.get(url, timeout=timeout_sec)
            if res.status_code == 200:
                logger.info("Backend Render & Neon PostgreSQL OPÉRATIONNELS (200 OK).")
                log_system(run_id, "health_check", "OK", "Backend et base de données prêts.")
                return True
            else:
                logger.warning(f"Backend a répondu avec le statut HTTP {res.status_code}.")
        except Exception as e:
            logger.warning(f"Tentative {attempt} sur {url} non aboutie: {e}")

        if attempt <= max_retries:
            time.sleep(pause_sec)

    logger.info("Test de repli : Vérification directe de la connexion Neon PostgreSQL...")
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        conn.close()
        logger.info("Connexion directe Neon PostgreSQL RÉUSSIE (OK). Le pipeline peut s'exécuter.")
        log_system(run_id, "health_check", "WARNING", "Backend Render en veille, mais connexion directe Neon OK.")
        return True
    except Exception as db_err:
        msg = f"Impossible de joindre la base Neon ni le backend Render: {db_err}"
        logger.critical(msg)
        send_system_alert("CRITICAL", "health_check", msg, run_id=run_id)
        return False

def execute_pipeline():
    """Point d'entrée principal du pipeline."""
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M")
    run_id = f"{now_str}-{uuid.uuid4().hex[:6]}"

    logger.info(f"=== INITIALISATION PIPELINE RUN : {run_id} (JOB_TYPE={JOB_TYPE}, DRY_RUN={DRY_RUN}) ===")

    # 1. Health check préventif
    is_healthy = run_health_check(run_id)
    if not is_healthy:
        logger.error("Arrêt du pipeline : Ni le backend ni la base Neon ne sont joignables.")
        sys.exit(1)

    if JOB_TYPE == "health":
        logger.info("Fin d'exécution pour JOB_TYPE=health.")
        return

    # 2. Création du run en base
    if not DRY_RUN:
        create_pipeline_run(run_id)

    # 3. Liste des sources actives
    sources = [
        RemotiveSource(),
        JobicySource(),
        WeWorkRemotelySource(),
        HimalayasSource(),
        RemoteOKSource(),
        CompanySitesSource()
    ]

    total_found = 0
    total_created = 0
    total_ready = 0
    error_count = 0

    # 4. Traitement par source isolée
    for source in sources:
        source_name = source.name
        logger.info(f"--- Traitement de la source : {source_name} ---")

        # Vérification Circuit Breaker
        source_db = get_or_create_source(source_name) if not DRY_RUN else {"enabled": True}
        if source_db and not source_db.get("enabled"):
            logger.warning(f"Source {source_name} DÉSACTIVÉE en base. Sautée.")
            continue

        raw_opportunities = []
        try:
            raw_opportunities = source.fetch_opportunities()
            if not DRY_RUN and source_db:
                update_source_status(source_db["id"], success=True)
            log_system(run_id, f"source_{source_name}", "OK", f"{len(raw_opportunities)} opportunités trouvées.")
        except Exception as e:
            error_count += 1
            err_msg = f"Erreur de collecte sur {source_name}: {e}"
            logger.error(err_msg)
            if not DRY_RUN and source_db:
                update_source_status(source_db["id"], success=False, reason=str(e), max_failures=CIRCUIT_BREAKER_MAX_FAILURES)
            log_system(run_id, f"source_{source_name}", "ERROR", err_msg)
            continue

        total_found += len(raw_opportunities)

        # 5. Qualification, Déduplication, Scoring et Message
        for opp in raw_opportunities:
            try:
                comp_name = opp.get("company")
                role = opp.get("role")
                job_url = opp.get("url")
                opp_type = opp.get("type", "offre")

                # Déduplication déterministe
                dedupe_key = build_dedupe_key(opp_type, comp_name, job_url, role)
                if not DRY_RUN and opportunity_exists(dedupe_key):
                    continue

                # Extraction contact
                contact = extract_contact_from_text(opp.get("description", ""), comp_name)

                # Scoring
                score = calculate_opportunity_score(opp, contact)

                # Génération message (uniquement si score >= 60)
                message_data = None
                if score >= MIN_SCORE_FOR_AI:
                    content, provider = generate_opportunity_message(role, comp_name, opp.get("stack", []), contact)
                    message_data = {
                        "content": content,
                        "generated_by": provider
                    }
                    # Temporisation pour quotas gratuits Gemini (2 secondes)
                    time.sleep(2)

                # Statut
                status = "READY" if score >= 50 else "RESEARCHED"
                if status == "READY":
                    total_ready += 1

                if DRY_RUN:
                    logger.info(f"[DRY-RUN] Détectée : {comp_name} - {role} (Score: {score}/100, Statut: {status})")
                    total_created += 1
                else:
                    # Insertion PostgreSQL
                    company_id = get_or_create_company(comp_name, country=opp.get("country"), stack=opp.get("stack"))
                    opp_data = {
                        "company_id": company_id,
                        "source_id": source_db["id"] if source_db else None,
                        "type": opp_type,
                        "role": role,
                        "job_url": job_url,
                        "remote": opp.get("remote", False),
                        "country": opp.get("country"),
                        "stack_required": opp.get("stack", []),
                        "score": score,
                        "status": status,
                        "dedupe_key": dedupe_key,
                        "contact": contact,
                        "message": message_data
                    }
                    created_id = insert_opportunity(opp_data)
                    if created_id:
                        total_created += 1

            except Exception as opp_err:
                error_count += 1
                logger.error(f"Erreur sur opportunité ({opp.get('company')}): {opp_err}")
                log_system(run_id, f"process_opp_{opp.get('company')}", "ERROR", str(opp_err))

    # 6. Clôture du run
    final_status = "SUCCESS" if error_count == 0 else ("PARTIAL" if total_created > 0 else "FAILED")
    if not DRY_RUN:
        finalize_pipeline_run(
            run_id,
            status=final_status,
            opps_found=total_found,
            opps_created=total_created,
            opps_ready=total_ready,
            errors=error_count
        )
    log_system(run_id, "pipeline_end", "OK", f"Run terminé ({final_status}). Créées: {total_created}, Prêtes: {total_ready}.")
    logger.info(f"=== PIPELINE RUN TERMINÉ : Trouvées={total_found}, Créées={total_created}, Prêtes={total_ready}, Erreurs={error_count} ===")

if __name__ == "__main__":
    execute_pipeline()
