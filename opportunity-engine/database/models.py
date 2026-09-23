import json
import logging
from datetime import datetime, timezone
from database.connection import get_db_connection

logger = logging.getLogger(__name__)

def log_system(run_id, step, status, message=None, payload=None):
    """
    Enregistre un événement dans la table system_logs.
    status: 'OK', 'WARNING', 'ERROR', 'CRITICAL'
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO system_logs (run_id, step, status, message, payload, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (run_id, step, status, message, json.dumps(payload) if payload else None))
        conn.commit()
    except Exception as e:
        logger.error(f"Échec de l'écriture dans system_logs: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

def create_pipeline_run(run_id):
    """Crée l'entrée initiale d'un run de pipeline."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO pipeline_runs (run_id, started_at, status, opportunities_found, opportunities_created, opportunities_ready, error_count)
                VALUES (%s, NOW(), 'RUNNING', 0, 0, 0, 0)
                ON CONFLICT (run_id) DO UPDATE SET started_at = NOW(), status = 'RUNNING'
            """, (run_id,))
        conn.commit()
    except Exception as e:
        logger.error(f"Échec de l'initialisation de pipeline_run {run_id}: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

def finalize_pipeline_run(run_id, status='SUCCESS', opps_found=0, opps_created=0, opps_ready=0, errors=0):
    """Met à jour et clôture un run dans pipeline_runs."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE pipeline_runs
                SET finished_at = NOW(),
                    status = %s,
                    opportunities_found = %s,
                    opportunities_created = %s,
                    opportunities_ready = %s,
                    error_count = %s
                WHERE run_id = %s
            """, (status, opps_found, opps_created, opps_ready, errors, run_id))
        conn.commit()
    except Exception as e:
        logger.error(f"Échec de finalisation de pipeline_run {run_id}: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

def get_or_create_source(source_name):
    """Récupère ou initialise une source dans la table sources."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT id, enabled, consecutive_failures FROM sources WHERE name = %s", (source_name,))
            row = cur.fetchone()
            if row:
                return {"id": row[0], "enabled": row[1], "consecutive_failures": row[2]}
            
            cur.execute("""
                INSERT INTO sources (name, enabled, consecutive_failures, created_at)
                VALUES (%s, TRUE, 0, NOW())
                RETURNING id, enabled, consecutive_failures
            """, (source_name,))
            res = cur.fetchone()
            conn.commit()
            return {"id": res[0], "enabled": res[1], "consecutive_failures": res[2]}
    except Exception as e:
        logger.error(f"Erreur get_or_create_source ({source_name}): {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def update_source_status(source_id, success, reason=None, max_failures=5):
    """
    Met à jour l'état d'une source après une tentative de scrape.
    Applique le circuit breaker si consecutive_failures >= max_failures.
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            if success:
                cur.execute("""
                    UPDATE sources
                    SET consecutive_failures = 0,
                        last_success_at = NOW()
                    WHERE id = %s
                """, (source_id,))
            else:
                cur.execute("""
                    UPDATE sources
                    SET consecutive_failures = consecutive_failures + 1,
                        last_failure_at = NOW(),
                        last_failure_reason = %s
                    WHERE id = %s
                    RETURNING consecutive_failures
                """, (reason, source_id))
                row = cur.fetchone()
                if row and row[0] >= max_failures:
                    # Circuit breaker déclenché
                    cur.execute("""
                        UPDATE sources
                        SET enabled = FALSE,
                            disabled_at = NOW(),
                            disabled_reason = %s
                        WHERE id = %s
                    """, (f"Désactivée après {row[0]} échecs consécutifs: {reason}", source_id))
                    logger.warning(f"Source ID {source_id} DÉSACTIVÉE (Circuit Breaker atteint).")
        conn.commit()
    except Exception as e:
        logger.error(f"Erreur update_source_status (source_id {source_id}): {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

def get_or_create_company(name, website=None, country=None, stack=None):
    """Récupère ou crée une entreprise dans la table companies."""
    if not name:
        return None
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM companies WHERE name = %s AND (website = %s OR website IS NULL)", (name, website))
            row = cur.fetchone()
            if row:
                cur.execute("UPDATE companies SET last_seen = NOW() WHERE id = %s", (row[0],))
                conn.commit()
                return row[0]
            
            cur.execute("""
                INSERT INTO companies (name, website, country, stack_detected, first_seen, last_seen)
                VALUES (%s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (name, website) DO UPDATE SET last_seen = NOW()
                RETURNING id
            """, (name, website, country, stack or []))
            comp_id = cur.fetchone()[0]
            conn.commit()
            return comp_id
    except Exception as e:
        logger.error(f"Erreur get_or_create_company ({name}): {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def opportunity_exists(dedupe_key):
    """Vérifie si une opportunité existe déjà via sa dedupe_key."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM opportunities WHERE dedupe_key = %s", (dedupe_key,))
            return cur.fetchone() is not None
    except Exception as e:
        logger.error(f"Erreur vérification opportunity_exists ({dedupe_key}): {e}")
        return False
    finally:
        if conn:
            conn.close()

def insert_opportunity(data):
    """
    Insère une nouvelle opportunité et ses entités associées (contact, message).
    Retourne l'ID créé ou None.
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO opportunities (
                    company_id, source_id, type, role, job_url, remote, country,
                    stack_required, score, status, dedupe_key, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id
            """, (
                data.get("company_id"),
                data.get("source_id"),
                data.get("type", "offre"),
                data.get("role"),
                data.get("job_url"),
                data.get("remote", False),
                data.get("country"),
                data.get("stack_required", []),
                data.get("score", 0),
                data.get("status", "NEW"),
                data.get("dedupe_key")
            ))
            opp_id = cur.fetchone()[0]

            # Contact si présent
            contact = data.get("contact")
            if contact and (contact.get("email") or contact.get("full_name")):
                cur.execute("""
                    INSERT INTO contacts (
                        opportunity_id, full_name, role, email, email_confidence, linkedin_url, verified, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    opp_id,
                    contact.get("full_name"),
                    contact.get("role"),
                    contact.get("email"),
                    contact.get("email_confidence", 50),
                    contact.get("linkedin_url"),
                    contact.get("verified", False)
                ))

            # Message si présent
            message = data.get("message")
            if message and message.get("content"):
                cur.execute("""
                    INSERT INTO messages_opportunities (
                        opportunity_id, generated_by, content, edited_by_user, send_status, created_at
                    )
                    VALUES (%s, %s, %s, FALSE, 'NOT_SENT', NOW())
                """, (
                    opp_id,
                    message.get("generated_by", "template"),
                    message.get("content")
                ))

            conn.commit()
            return opp_id
    except Exception as e:
        logger.error(f"Erreur insert_opportunity: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()
