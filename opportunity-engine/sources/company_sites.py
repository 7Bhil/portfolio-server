import requests
from bs4 import BeautifulSoup
import logging
from sources.base import BaseSource

logger = logging.getLogger(__name__)

class CompanySitesSource(BaseSource):
    """
    Adaptateur pour scanner des pages carrières publiques ciblées
    (entreprises locales, écosystème tech africain et partenaires).
    """
    def __init__(self):
        super().__init__("CompanySites")
        self.targets = [
            {
                "company": "Sèmè City",
                "url": "https://semecity.bj",
                "country": "Bénin",
                "default_role": "Développeur Full-Stack / Ingénieur Logiciel",
                "type": "spontanee"
            },
            {
                "company": "Open SI",
                "url": "https://opensi.bj",
                "country": "Bénin",
                "default_role": "Développeur Web & Mobile Full-Stack",
                "type": "spontanee"
            },
            {
                "company": "Wave Mobile Money",
                "url": "https://wave.com",
                "country": "Sénégal / Côte d'Ivoire",
                "default_role": "Software Engineer Full-Stack",
                "type": "spontanee"
            }
        ]

    def fetch_opportunities(self) -> list:
        logger.info(f"[{self.name}] Début de l'analyse des sites entreprises cibles...")
        normalized = []

        headers = {
            "User-Agent": "OpportunityEngine/1.0 (Portfolio Project; contact: 7bhil.chitou7@gmail.com)"
        }

        for target in self.targets:
            try:
                # Vérification rapide de disponibilité du site
                res = requests.get(target["url"], headers=headers, timeout=10)
                if res.status_code == 200:
                    normalized.append({
                        "company": target["company"],
                        "role": target["default_role"],
                        "url": target["url"],
                        "country": target["country"],
                        "remote": True,
                        "description": f"Candidature spontanée ciblée pour {target['company']} en tant que {target['default_role']}.",
                        "stack": ["React", "Node.js", "Python", "Mobile", "PostgreSQL"],
                        "type": target["type"]
                    })
            except Exception as e:
                logger.warning(f"[{self.name}] Impossible de joindre {target['company']}: {e}")

        logger.info(f"[{self.name}] {len(normalized)} opportunités générées.")
        return normalized
