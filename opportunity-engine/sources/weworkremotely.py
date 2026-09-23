import requests
import xml.etree.ElementTree as ET
import logging
from bs4 import BeautifulSoup
from sources.base import BaseSource

logger = logging.getLogger(__name__)

class WeWorkRemotelySource(BaseSource):
    """
    Adaptateur pour le flux RSS public We Work Remotely.
    URL: https://weworkremotely.com/categories/remote-programming-jobs.rss
    """
    def __init__(self):
        super().__init__("WeWorkRemotely")
        self.rss_url = "https://weworkremotely.com/categories/remote-programming-jobs.rss"

    def fetch_opportunities(self) -> list:
        logger.info(f"[{self.name}] Début de la collecte via flux RSS...")
        headers = {
            "User-Agent": "OpportunityEngine/1.0 (Portfolio Project; contact: 7bhil.chitou7@gmail.com)"
        }
        res = requests.get(self.rss_url, headers=headers, timeout=20)
        res.raise_for_status()

        root = ET.fromstring(res.content)
        items = root.findall("./channel/item")

        normalized = []
        for item in items[:25]:
            title = item.find("title").text if item.find("title") is not None else ""
            link = item.find("link").text if item.find("link") is not None else ""
            description = item.find("description").text if item.find("description") is not None else ""

            # Titre WWR souvent formaté comme : "Company Name: Job Title"
            company = "Inconnue"
            role = title
            if ":" in title:
                parts = title.split(":", 1)
                company = parts[0].strip()
                role = parts[1].strip()

            clean_desc = BeautifulSoup(description, "html.parser").get_text(separator=" ")

            keywords = ["React", "TypeScript", "Node", "Python", "Mobile", "PostgreSQL", "Full-Stack"]
            detected = [k for k in keywords if k.lower() in clean_desc.lower()]

            normalized.append({
                "company": company,
                "role": role,
                "url": link.strip(),
                "country": "Remote International",
                "remote": True,
                "description": clean_desc,
                "stack": detected,
                "type": "offre"
            })

        logger.info(f"[{self.name}] {len(normalized)} opportunités collectées avec succès.")
        return normalized
