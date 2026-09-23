import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from config.settings import NEON_DATABASE_URL

logger = logging.getLogger(__name__)

def get_db_connection():
    """
    Établit et retourne une connexion à PostgreSQL Neon.
    Gère le connect_timeout de 30s.
    """
    if not NEON_DATABASE_URL:
        raise ValueError("NEON_DATABASE_URL ou DATABASE_URL n'est pas configuré.")
    
    conn = psycopg2.connect(
        NEON_DATABASE_URL,
        connect_timeout=30,
        sslmode="require"
    )
    conn.autocommit = False
    return conn
