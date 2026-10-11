import sqlite3
import os

# Database stored at backend/recruiter_bot.db, one level above the app package
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "recruiter_bot.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_connection() -> sqlite3.Connection:
    """
    Open and return a SQLite connection with:
      - Row factory set so columns are accessible by name (row["column"])
      - Foreign key enforcement enabled (OFF by default in SQLite)
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    """
    Execute schema.sql against the database.
    Uses executescript() which auto-commits each statement — correct for DDL.
    The schema begins with DROP TABLE IF EXISTS guards so re-seeding is safe.
    """
    conn = get_connection()
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.close()
