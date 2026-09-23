import requests
import logging
from config.settings import RESEND_API_KEY

logger = logging.getLogger(__name__)

def send_email_resend(to_email: str, subject: str, content: str, idempotency_key: str = None) -> dict:
    """
    Envoie un e-mail via l'API Resend avec support d'idempotency-key.
    """
    if not RESEND_API_KEY:
        raise ValueError("RESEND_API_KEY manquant.")

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key

    payload = {
        "from": "Bhilal CHITOU <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "text": content
    }

    res = requests.post(url, json=payload, headers=headers, timeout=20)
    res.raise_for_status()
    return res.json()
