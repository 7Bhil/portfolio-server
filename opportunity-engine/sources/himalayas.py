import requests
import logging
from sources.base import BaseSource

logger = logging.getLogger(__name__)

class HimalayasSource(BaseSource):
    """
    Adaptateur pour l'API publique Himalayas.
    Endpoint: https://himalayas.app/jobs/api
    """
    def __init__(self):
        super().__init__("Himalayas")
        self.api_url = "https://himalayas.app/jobs/api?limit=25"

    def fetch_opportunities(self) -> list:
        logger.info(f"[{self.name}] Début de la collecte via API...")
        headers = {
            "User-Agent": "OpportunityEngine/1.0 (Portfolio Project; contact: 7bhil.chitou7@gmail.com)"
        }
        res = requests.get(self.api_url, headers=headers, timeout=20)
        res.raise_for_status()
        data = res.json()

        jobs = data.get("jobs", [])
        normalized = []

        for job in jobs:
            title = job.get("title", "")
            company = job.get("companyName", "")
            slug = job.get("slug", "")
            company_slug = job.get("companySlug", "")
            url = f"https://himalayas.app/companies/{company_slug}/jobs/{slug}" if slug else "https://himalayas.app"
            description = job.get("description", "")
            categories = job.get("categories", [])
            skills = job.get("skills", [])

            # Filtre orienté tech / engineering
            is_tech = any(cat.lower() in ["engineering", "developer", "software"] for cat in categories) or len(skills) > 0
            if not is_tech:
                continue

            normalized.append({
                "company": company.strip(),
                "role": title.strip(),
                "url": url.strip(),
                "country": "Remote",
                "remote": True,
                "description": description,
                "stack": skills[:6] if skills else ["Full-Stack"],
                "type": "offre"
            })

        logger.info(f"[{self.name}] {len(normalized)} opportunités collectées avec succès.")
        return normalized
