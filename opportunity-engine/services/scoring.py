from config.settings import PROFILE

def is_internship(role: str, description: str) -> bool:
    """Détecte si l'offre concerne un stage ou une alternance."""
    text = (role + " " + description).lower()
    internship_keywords = ["stage", "intern", "internship", "stagiaire", "alternance", "apprentice", "junior"]
    return any(k in text for k in internship_keywords)

def calculate_opportunity_score(opportunity: dict, contact: dict = None) -> int:
    """
    Calcule le score de qualification transparent et déterministe.
    Grille de scoring conforme à la spécification :
    - Remote : +25
    - Stage / Alternance / Junior : +20
    - Stack compatible : +15
    - Fintech / Paiement / Web : +10
    - Afrique : +10
    - International avec remote : +5
    - Contact identifié : +5
    - Contact vérifié : +5
    Total brut max : 95 points.
    Normalisation : round((score_brut / 95) * 100) plafonné à 100.
    """
    score_brut = 0
    role = opportunity.get("role", "")
    description = opportunity.get("description", "")
    country = opportunity.get("country", "")
    stack = opportunity.get("stack", [])
    remote = opportunity.get("remote", False)

    # 1. Remote (+25)
    if remote or "remote" in (role + " " + country).lower():
        score_brut += 25

    # 2. Stage / Junior (+20)
    if is_internship(role, description):
        score_brut += 20

    # 3. Stack compatible (+15)
    my_stack_lower = [s.lower() for s in PROFILE["stack"]]
    opp_stack_lower = [s.lower() for s in stack]
    has_stack_match = any(s in my_stack_lower for s in opp_stack_lower) or any(
        s in (role + " " + description).lower() for s in ["react", "node", "python", "fullstack", "full-stack", "typescript"]
    )
    if has_stack_match:
        score_brut += 15

    # 4. Fintech / Paiement (+10)
    fintech_keywords = ["fintech", "payment", "paiement", "banque", "finance", "mobile money", "wallet"]
    if any(k in (role + " " + description).lower() for k in fintech_keywords):
        score_brut += 10

    # 5. Géographie Afrique (+10) ou International (+5)
    africa_keywords = ["bénin", "benin", "sénégal", "senegal", "côte d'ivoire", "nigeria", "ghana", "togo", "africa", "afrique"]
    if any(k in country.lower() for k in africa_keywords):
        score_brut += 10
    elif remote or "worldwide" in country.lower():
        score_brut += 5

    # 6. Contact (+5 identifié, +5 vérifié)
    if contact and contact.get("email"):
        score_brut += 5
        if contact.get("verified"):
            score_brut += 5

    # Normalisation déterministe
    score_final = round((score_brut / 95) * 100)
    return min(score_final, 100)
