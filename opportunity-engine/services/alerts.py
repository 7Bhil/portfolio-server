import logging
from datetime import datetime, timezone, timedelta
from database.connection import get_db_connection
from services.email import send_email_resend
from config.settings import ALERT_EMAIL, ALERT_COOLDOWN_MINUTES

logger = logging.getLogger(__name__)

def should_send_alert(alert_key: str, cooldown_minutes: int = 60) -> bool:
    """
    Vérifie dans alert_state si une alerte pour cette clé a déjà été émise
    durant la fenêtre de cooldown.
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT last_alerted_at FROM alert_state WHERE alert_key = %s", (alert_key,))
            row = cur.fetchone()
            now = datetime.now(timezone.utc)
            if not row:
                # Première alerte
                cur.execute("""
                    INSERT INTO alert_state (alert_key, last_alerted_at, cooldown_minutes)
                    VALUES (%s, NOW(), %s)
                """, (alert_key, cooldown_minutes))
                conn.commit()
                return True
            
            last_alerted_at = row[0]
            if last_alerted_at.tzinfo is None:
                last_alerted_at = last_alerted_at.replace(tzinfo=timezone.utc)

            if now - last_alerted_at > timedelta(minutes=cooldown_minutes):
                cur.execute("""
                    UPDATE alert_state
                    SET last_alerted_at = NOW()
                    WHERE alert_key = %s
                """, (alert_key,))
                conn.commit()
                return True

            logger.info(f"Alerte '{alert_key}' ignorée (cooldown actif de {cooldown_minutes} min).")
            return False
    except Exception as e:
        logger.error(f"Erreur vérification alert_state: {e}")
        return True # Par précaution en cas d'erreur de base
    finally:
        if conn:
            conn.close()

def send_system_alert(level: str, step: str, message: str, run_id: str = None, details: str = None):
    """
    Envoie une alerte e-mail si le cooldown le permet.
    Format conforme §14 de la spécification.
    """
    alert_key = f"{step}_{level}".lower()
    if not should_send_alert(alert_key, ALERT_COOLDOWN_MINUTES):
        return

    subject = f"[Opportunity Engine] {level} — {step}"
    body = f"""Sujet : {subject}

Run ID  : {run_id or 'N/A'}
Étape   : {step}
Statut  : {level}

Message :
{message}

Détails :
{details or 'Aucun détail supplémentaire.'}

Panel Admin :
https://7bhil.vercel.app/admin
"""
    try:
        send_email_resend(ALERT_EMAIL, subject, body)
        logger.info(f"Alerte e-mail {level} envoyée à {ALERT_EMAIL}.")
    except Exception as e:
        logger.error(f"Échec de l'envoi de l'alerte e-mail: {e}")

def send_run_digest(run_id: str, status: str, found_count: int, created_count: int, ready_count: int, top_opportunities: list = None):
    """
    Envoie un e-mail de synthèse / digest à la fin de chaque run du pipeline.
    """
    subject = f"[Opportunity Engine] Rapport d'exécution : {ready_count} opportunités prêtes ({status})"
    
    top_lines = []
    if top_opportunities:
        for i, opp in enumerate(top_opportunities[:7], 1):
            comp = opp.get("company", "Entreprise inconnue")
            role = opp.get("role", "Rôle non spécifié")
            score = opp.get("score", 0)
            url = opp.get("url", "")
            top_lines.append(f"{i}. [{score}/100] {role} chez {comp}\n   Lien : {url}")
    
    top_text = "\n\n".join(top_lines) if top_lines else "Aucune nouvelle opportunité qualifiée avec score >= 60 lors de ce run."

    body = f"""Bonjour Bhilal,

Voici le récapitulatif de la session de prospection Opportunity Engine :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BILAN DU RUN ({run_id})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Statut global      : {status}
• Offres analysées   : {found_count}
• Nouvelles retenues : {created_count} (score >= 60)
• Prêtes à envoyer   : {ready_count}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOP OPPORTUNITÉS QUALIFIÉES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{top_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION & ENVOI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Connecte-toi sur ton dashboard pour relire les messages personnalisés et envoyer tes candidatures en un clic :
👉 https://7bhil.vercel.app/admin

Bhilal CHITOU — Opportunity Engine Automatisé
"""
    try:
        from database.models import log_system
        res = send_email_resend(ALERT_EMAIL, subject, body)
        logger.info(f"Digest de run envoyé avec succès à {ALERT_EMAIL}: {res}")
        log_system(run_id, "digest_email", "OK", f"Digest envoyé à {ALERT_EMAIL}", payload=res)
    except Exception as e:
        logger.error(f"Échec de l'envoi du digest de run: {e}")
        try:
            from database.models import log_system
            log_system(run_id, "digest_email", "ERROR", f"Échec envoi digest à {ALERT_EMAIL}: {e}")
        except Exception:
            pass

