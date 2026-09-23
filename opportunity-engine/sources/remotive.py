import requests
import logging
from sources.base import BaseSource

logger = logging.getLogger(__name__)

class RemotiveSource(BaseSource):
    """
    Adaptateur pour l'API publique Remotive.
    Endpoint: https://remotive.com/api/remote-jobs
    """
    def __init__(self):
        super().__init__("Remotive")
        self.api_url = "https://remotive.com/api/remote-jobs?category=software-dev&limit=25"

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
            tags = job.get("tags", [])
            description = job.get("description", "")
            company_name = job.get("company_name", "")
            url = job.get("url", "")
            country = job.get("candidate_required_location", "Worldwide")

            # Extraction ou mapping de stack
            stack = list(set([t.title() for t in tags if isinstance(t, str)]))

            normalized.append({
                "company": company_name.strip(),
                "role": title.strip(),
                "url": url.strip(),
                "country": country,
                "remote": True,
                "description": description,
                "stack": stack,
                "type": "offre"
            })

        logger.info(f"[{self.name}] {len(normalized)} opportunités collectées avec succès.")
        return normalized
