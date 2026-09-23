import os
from dotenv import load_dotenv

load_dotenv()

# Base de données
NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL") or os.getenv("DATABASE_URL")

# Backend Render
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5005")

# APIs IA
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# Emailing & Alertes
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
ALERT_EMAIL = os.getenv("ALERT_EMAIL", "7bhil.chitou7@gmail.com")

# Configuration de l'exécution
JOB_TYPE = os.getenv("JOB_TYPE", "full").lower()
DRY_RUN = os.getenv("DRY_RUN", "false").lower() in ("true", "1", "yes")

# Paramètres de circuit breaker
CIRCUIT_BREAKER_MAX_FAILURES = 5

# Anti-spam d'alertes
ALERT_COOLDOWN_MINUTES = 60

# Seuil de scoring pour déclenchement IA
MIN_SCORE_FOR_AI = 60

# Profil officiel Bhilal CHITOU
PROFILE = {
    "name": "Bhilal CHITOU",
    "role": "Développeur Full-Stack & Mobile",
    "portfolio": "https://7bhil.vercel.app",
    "github": "https://github.com/7Bhil",
    "linkedin": "https://www.linkedin.com/in/bhilal-chitou/",
    "email": "7bhilal.chitou7@gmail.com",
    "phone": "+229 01 44 24 29 64",
    "stack": [
        "React", "React Native", "TypeScript", "JavaScript", 
        "Node.js", "Express", "Python", "Django", "PostgreSQL", 
        "Tailwind CSS", "Astro", "Docker"
    ]
}
