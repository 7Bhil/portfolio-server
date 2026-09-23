from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class BaseSource(ABC):
    """
    Classe de base pour toutes les sources d'opportunités.
    Chaque adaptateur doit implémenter scrape() et retourner une liste de dictionnaires formatés :
    {
        "company": str,
        "role": str,
        "url": str,
        "country": str,
        "remote": bool,
        "description": str,
        "stack": list[str],
        "type": "offre" | "spontanee"
    }
    """
    def __init__(self, name):
        self.name = name

    @abstractmethod
    def fetch_opportunities(self) -> list:
        """Exécute la collecte et retourne la liste des offres brutes normalisées."""
        pass
