import re
import logging

logger = logging.getLogger(__name__)

def extract_contact_from_text(text: str, company_name: str) -> dict:
    """
    Extrait un e-mail ou nom de contact professionnel d'une description.
    Si aucun e-mail trouvé, tente de déduire l'e-mail générique ou retourne contact partiel.
    """
    if not text:
        return None

    # Recherche d'emails dans le texte
    emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    valid_emails = [e for e in emails if not any(ign in e.lower() for ign in ["example.com", "domain.com", "sentry.io"])]

    if valid_emails:
        email = valid_emails[0]
        confidence = 85 if any(k in email.lower() for k in ["jobs", "recrutement", "careers", "talent", "hr"]) else 70
        return {
            "full_name": None,
            "role": "Recrutement / Talent",
            "email": email,
            "email_confidence": confidence,
            "verified": False,
            "linkedin_url": None
        }

    return None
