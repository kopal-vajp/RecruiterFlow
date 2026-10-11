"""
repository.py — Pure data access layer.

All queries use raw SQL via Python's built-in sqlite3 module.
No ORM, no query builder. Every query is hand-written.

Each public function opens its own connection, executes queries, closes the
connection, and returns plain Python dicts — keeping the layer stateless and
easy to test.
"""

from typing import Any, Dict, List, Optional

from app.db import get_connection


# ---------------------------------------------------------------------------
# Candidates
# ---------------------------------------------------------------------------

def fetch_all_candidates() -> List[Dict[str, Any]]:
    """
    Return all candidates with their associated skills and traits.

    Uses three separate SELECT statements per candidate rather than a big JOIN
    to keep result-set assembly simple and avoid duplicated candidate rows.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, experience_years, availability, quirk FROM candidates ORDER BY id"
        )
        rows = cursor.fetchall()

        candidates = []
        for row in rows:
            c_id = row["id"]

            cursor.execute(
                "SELECT skill FROM candidate_skills WHERE candidate_id = ? ORDER BY skill",
                (c_id,),
            )
            skills = [r["skill"] for r in cursor.fetchall()]

            cursor.execute(
                "SELECT trait FROM candidate_traits WHERE candidate_id = ? ORDER BY trait",
                (c_id,),
            )
            traits = [r["trait"] for r in cursor.fetchall()]

            candidates.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "experience_years": row["experience_years"],
                    "availability": row["availability"],
                    "quirk": row["quirk"],
                    "skills": skills,
                    "traits": traits,
                }
            )
        return candidates
    finally:
        conn.close()


def fetch_candidate_by_id(candidate_id: int) -> Optional[Dict[str, Any]]:
    """Return a single candidate dict, or None if not found."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, experience_years, availability, quirk "
            "FROM candidates WHERE id = ?",
            (candidate_id,),
        )
        row = cursor.fetchone()
        if row is None:
            return None

        cursor.execute(
            "SELECT skill FROM candidate_skills WHERE candidate_id = ? ORDER BY skill",
            (candidate_id,),
        )
        skills = [r["skill"] for r in cursor.fetchall()]

        cursor.execute(
            "SELECT trait FROM candidate_traits WHERE candidate_id = ? ORDER BY trait",
            (candidate_id,),
        )
        traits = [r["trait"] for r in cursor.fetchall()]

        return {
            "id": row["id"],
            "name": row["name"],
            "experience_years": row["experience_years"],
            "availability": row["availability"],
            "quirk": row["quirk"],
            "skills": skills,
            "traits": traits,
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

def fetch_all_jobs() -> List[Dict[str, Any]]:
    """Return all job postings with their required skills and culture keywords."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, min_experience_years, tagline FROM jobs ORDER BY id"
        )
        rows = cursor.fetchall()

        jobs = []
        for row in rows:
            j_id = row["id"]

            cursor.execute(
                "SELECT skill FROM job_skills WHERE job_id = ? ORDER BY skill",
                (j_id,),
            )
            skills = [r["skill"] for r in cursor.fetchall()]

            cursor.execute(
                "SELECT keyword FROM job_culture_keywords WHERE job_id = ? ORDER BY keyword",
                (j_id,),
            )
            keywords = [r["keyword"] for r in cursor.fetchall()]

            jobs.append(
                {
                    "id": row["id"],
                    "title": row["title"],
                    "min_experience_years": row["min_experience_years"],
                    "tagline": row["tagline"],
                    "required_skills": skills,
                    "culture_keywords": keywords,
                }
            )
        return jobs
    finally:
        conn.close()


def fetch_job_by_id(job_id: int) -> Optional[Dict[str, Any]]:
    """Return a single job dict, or None if not found."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, min_experience_years, tagline FROM jobs WHERE id = ?",
            (job_id,),
        )
        row = cursor.fetchone()
        if row is None:
            return None

        cursor.execute(
            "SELECT skill FROM job_skills WHERE job_id = ? ORDER BY skill",
            (job_id,),
        )
        skills = [r["skill"] for r in cursor.fetchall()]

        cursor.execute(
            "SELECT keyword FROM job_culture_keywords WHERE job_id = ? ORDER BY keyword",
            (job_id,),
        )
        keywords = [r["keyword"] for r in cursor.fetchall()]

        return {
            "id": row["id"],
            "title": row["title"],
            "min_experience_years": row["min_experience_years"],
            "tagline": row["tagline"],
            "required_skills": skills,
            "culture_keywords": keywords,
        }
    finally:
        conn.close()
