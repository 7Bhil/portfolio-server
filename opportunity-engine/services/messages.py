import os
import requests
import logging
from config.settings import GEMINI_API_KEY, DEEPSEEK_API_KEY, PROFILE

logger = logging.getLogger(__name__)

def generate_with_gemini(role: str, company: str, stack: list, contact_name: str = None) -> str:
    """Génération du message d'accroche via Google Gemini."""
    if not GEMINI_API_KEY:
        raise ValueError("Clé GEMINI_API_KEY absente.")

    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""
Tu es Bhilal CHITOU, développeur Full-Stack & Mobile (React, Node.js, Python, TypeScript, PostgreSQL, Mobile).
Rédige un message d'accroche personnalisé, professionnel, concis (maximum 150 mots) et percutant pour postuler à cette offre :
- Rôle : {role}
- Entreprise : {company}
- Technologies demandées : {', '.join(stack) if stack else 'Full-Stack'}
- Destinataire : {contact_name or 'l équipe de recrutement'}

Contraintes strictes :
- Sois direct, humble et axé sur les résultats concrets.
- Inclus obligatoirement les liens vers mon portfolio {PROFILE['portfolio']} et mon profil LinkedIn {PROFILE['linkedin']}.
- Pas de jargon pompeux, pas d'exagération.
- Écris en français impeccable.
"""
    response = model.generate_content(prompt)
    if response and response.text:
        return response.text.strip()
    raise RuntimeError("Réponse Gemini vide.")

def generate_with_deepseek(role: str, company: str, stack: list, contact_name: str = None) -> str:
    """Génération de repli via DeepSeek API si disponible."""
    if not DEEPSEEK_API_KEY:
        raise ValueError("Clé DEEPSEEK_API_KEY absente.")

    url = "https://api.deepseek.com/chat/completions"
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "user",
                "content": f"Rédige un e-mail de candidature concis et professionnel pour le poste de {role} chez {company}. Mon nom: Bhilal CHITOU, Full-Stack Dev. Portfolio: {PROFILE['portfolio']}. LinkedIn: {PROFILE['linkedin']}."
            }
        ]
    }
    res = requests.post(url, json=payload, headers=headers, timeout=15)
    res.raise_for_status()
    data = res.json()
    return data["choices"][0]["message"]["content"].strip()

def generate_with_template(role: str, company: str, stack: list, contact_name: str = None) -> str:
    """Template local déterministe en cas de défaillance des APIs IA externes."""
    template_path = os.path.join(os.path.dirname(__file__), "..", "templates", "application_email.txt")
    with open(template_path, "r", encoding="utf-8") as f:
        tpl = f.read()

    techs = ", ".join(stack[:4]) if stack else "React, Node.js et Python"
    dest = contact_name if contact_name else "l'équipe de recrutement"

    return tpl.format(
        contact_name=dest,
        role=role,
        company=company,
        stack=techs,
        portfolio=PROFILE["portfolio"],
        sender_name=PROFILE["name"],
        sender_email=PROFILE["email"],
        sender_github=PROFILE["github"],
        sender_linkedin=PROFILE["linkedin"]
    )

def generate_opportunity_message(role: str, company: str, stack: list, contact: dict = None) -> tuple:
    """
    Cascade de génération :
    1. Gemini
    2. DeepSeek (fallback)
    3. Template local (fallback ultime)
    Retourne (content: str, provider: str)
    """
    contact_name = contact.get("full_name") if contact else None

    # 1. Tentative Gemini
    try:
        content = generate_with_gemini(role, company, stack, contact_name)
        return content, "gemini"
    except Exception as e:
        logger.warning(f"Échec Gemini ({e}), passage au repli...")

    # 2. Tentative DeepSeek
    try:
        content = generate_with_deepseek(role, company, stack, contact_name)
        return content, "deepseek"
    except Exception as e:
        logger.warning(f"Échec DeepSeek ({e}), utilisation du template local.")

    # 3. Template local garanti
    return generate_with_template(role, company, stack, contact_name), "template"
