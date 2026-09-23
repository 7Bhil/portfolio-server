import hashlib
import re

def normalize_text(text: str) -> str:
    """Nettoie et normalise une chaîne de caractères (minuscules, sans caractères spéciaux)."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r'https?://(www\.)?', '', text)
    text = re.sub(r'[^\w\s]', '', text)
    return re.sub(r'\s+', ' ', text).strip()

def build_dedupe_key(opp_type: str, company_name: str, job_url: str, role: str) -> str:
    """
    Génère un hash SHA-256 déterministe pour éviter les doublons.
    dedupe_key = hash(type + company_name + normalized_job_url + normalized_role)
    """
    norm_type = normalize_text(opp_type or "offre")
    norm_company = normalize_text(company_name or "")
    norm_url = normalize_text(job_url or "")
    norm_role = normalize_text(role or "")

    raw_signature = f"{norm_type}|{norm_company}|{norm_url}|{norm_role}"
    return hashlib.sha256(raw_signature.encode("utf-8")).hexdigest()
