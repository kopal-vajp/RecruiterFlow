"""
seed.py — Ingests seed data into the SQLite database using raw INSERT statements.

Run directly:
    cd backend
    python -m app.seed          # from repo root (after activating venv)

This script:
  1. Calls init_db() to recreate tables from schema.sql (idempotent — safe to re-run)
  2. Parses data/seed.json
  3. Inserts all candidates, their skills, their traits, all jobs, job skills,
     and job culture keywords using explicit parameterised raw SQL
"""

import json
import os

from app.db import get_connection, init_db

SEED_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "seed.json"
)


def seed_database() -> None:
    print("Initialising database schema …")
    init_db()

    print(f"Loading seed data from {SEED_DATA_PATH} …")
    with open(SEED_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    conn = get_connection()
    cursor = conn.cursor()

    # ------------------------------------------------------------------
    # Candidates
    # ------------------------------------------------------------------
    for c in data["candidates"]:
        cursor.execute(
            """
            INSERT INTO candidates (id, name, experience_years, availability, quirk)
            VALUES (?, ?, ?, ?, ?)
            """,
            (c["id"], c["name"], c["experience_years"], c["availability"], c["quirk"]),
        )
        for skill in c["skills"]:
            cursor.execute(
                "INSERT INTO candidate_skills (candidate_id, skill) VALUES (?, ?)",
                (c["id"], skill),
            )
        for trait in c["traits"]:
            cursor.execute(
                "INSERT INTO candidate_traits (candidate_id, trait) VALUES (?, ?)",
                (c["id"], trait),
            )

    # ------------------------------------------------------------------
    # Jobs
    # ------------------------------------------------------------------
    for j in data["jobs"]:
        cursor.execute(
            """
            INSERT INTO jobs (id, title, min_experience_years, tagline)
            VALUES (?, ?, ?, ?)
            """,
            (j["id"], j["title"], j["min_experience_years"], j["tagline"]),
        )
        for skill in j["required_skills"]:
            cursor.execute(
                "INSERT INTO job_skills (job_id, skill) VALUES (?, ?)",
                (j["id"], skill),
            )
        for keyword in j["culture_keywords"]:
            cursor.execute(
                "INSERT INTO job_culture_keywords (job_id, keyword) VALUES (?, ?)",
                (j["id"], keyword),
            )

    conn.commit()
    conn.close()

    n_candidates = len(data["candidates"])
    n_jobs = len(data["jobs"])
    print(
        f"[OK] Seeded {n_candidates} candidates and {n_jobs} jobs "
        "into recruiter_bot.db successfully."
    )


if __name__ == "__main__":
    seed_database()
