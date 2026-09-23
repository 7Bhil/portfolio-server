import requests
import logging
from sources.base import BaseSource

logger = logging.getLogger(__name__)

class JobicySource(BaseSource):
    """
    Adaptateur pour l'API publique Jobicy.
    Endpoint: https://jobicy.com/api/v2/remote-jobs
    """
    def __init__(self):
        super().__init__("Jobicy")
        self.api_url = "https://jobicy.com/api/v2/remote-jobs?count=25&industry=engineering"

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
            title = job.get("jobTitle", "")
            company_name = job.get("companyName", "")
            url = job.get("url", "")
            geo = job.get("jobGeo", "Worldwide")
            description = job.get("jobDescription", "")
            job_types = job.get("jobType", [])
            if isinstance(job_types, str):
                job_types = [job_types]

            # Détection stack dans description/titre
            keywords = ["React", "Node", "Python", "TypeScript", "JavaScript", "Docker", "PostgreSQL", "Full-Stack", "Mobile"]
            detected = [k for k in keywords if k.lower() in (description + " " + title).lower()]

            normalized.append({
                "company": company_name.strip(),
                "role": title.strip(),
                "url": url.strip(),
                "country": geo,
                "remote": True,
                "description": description,
                "stack": detected,
                "type": "offre"
            })

        logger.info(f"[{self.name}] {len(normalized)} opportunités collectées avec succès.")
        return normalized
