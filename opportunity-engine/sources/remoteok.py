import requests
import logging
from sources.base import BaseSource

logger = logging.getLogger(__name__)

class RemoteOKSource(BaseSource):
    """
    Adaptateur pour l'endpoint public RemoteOK.
    Endpoint: https://remoteok.com/api
    """
    def __init__(self):
        super().__init__("RemoteOK")
        self.api_url = "https://remoteok.com/api"

    def fetch_opportunities(self) -> list:
        logger.info(f"[{self.name}] Début de la collecte via API...")
        headers = {
            "User-Agent": "OpportunityEngine/1.0 (Portfolio Project; contact: 7bhil.chitou7@gmail.com)"
        }
        res = requests.get(self.api_url, headers=headers, timeout=20)
        res.raise_for_status()
        data = res.json()

        # Le premier élément est souvent une notice légale sur RemoteOK
        jobs = [j for j in data if isinstance(j, dict) and "position" in j]
        normalized = []

        for job in jobs[:25]:
            title = job.get("position", "")
            company = job.get("company", "")
            url = job.get("url", "")
            tags = job.get("tags", [])
            location = job.get("location", "Worldwide")
            description = job.get("description", "")

            stack = [t.title() for t in tags if isinstance(t, str)]

            normalized.append({
                "company": company.strip(),
                "role": title.strip(),
                "url": url.strip(),
                "country": location,
                "remote": True,
                "description": description,
                "stack": stack[:8],
                "type": "offre"
            })

        logger.info(f"[{self.name}] {len(normalized)} opportunités collectées avec succès.")
        return normalized
