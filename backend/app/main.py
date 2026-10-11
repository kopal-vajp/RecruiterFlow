"""
main.py — Thin FastAPI routing layer.

Responsibilities:
  - Accept HTTP requests
  - Delegate data fetching to repository.py
  - Delegate scoring to matching.py
  - Sort results and shape the response

No business logic, no SQL, no scoring math lives here.

Startup sequence
----------------
The `lifespan` context manager seeds the database on first boot if it does
not already exist, so the server is self-contained for local demos.
"""

from contextlib import asynccontextmanager
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException

from app.matching import calculate_match
from app.repository import (
    fetch_all_candidates,
    fetch_all_jobs,
    fetch_candidate_by_id,
    fetch_job_by_id,
)


# ---------------------------------------------------------------------------
# App lifecycle — seed DB on first startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    import os
    from app.db import DB_PATH

    if not os.path.exists(DB_PATH):
        from app.seed import seed_database
        seed_database()

    yield  # server runs here


app = FastAPI(
    title="RecruiterFlow Bot API",
    description=(
        "Matches fictional candidates with job postings based on "
        "skill overlap, experience, culture fit, and availability. "
        "Pure raw SQL backend, zero ORMs."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sort_job_matches(matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sort order (as required by spec):
      1. score DESC  (higher is better)
      2. experience_years DESC  (more experienced wins ties)
      3. candidate_name ASC  (alphabetical for remaining ties)
    """
    return sorted(
        matches,
        key=lambda m: (-m["score"], -m["experience_years"], m["candidate_name"]),
    )


def _sort_candidate_matches(matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sort order for candidate-centric view:
      1. score DESC
      2. min_experience_years DESC
      3. job_title ASC
    """
    return sorted(
        matches,
        key=lambda m: (-m["score"], -m["min_experience_years"], m["job_title"]),
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get(
    "/jobs/{job_id}/matches",
    summary="Get ranked candidate matches for a job posting",
    tags=["Matching"],
)
def get_matches_for_job(job_id: int) -> Dict[str, Any]:
    """
    Returns all candidates with at least one skill overlap with the job,
    ranked by the weighted scoring formula.

    Candidates with zero skill overlap are excluded entirely.
    """
    job = fetch_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job posting {job_id} not found.")

    candidates = fetch_all_candidates()
    matches: List[Dict[str, Any]] = []

    for candidate in candidates:
        result = calculate_match(candidate, job)
        if result is None:
            continue  # zero skill overlap — disqualified

        matches.append(
            {
                "candidate_id": candidate["id"],
                "candidate_name": candidate["name"],
                "experience_years": candidate["experience_years"],
                "availability": candidate["availability"],
                "quirk": candidate["quirk"],
                "score": result["score"],
                "breakdown": result["breakdown"],
                "reason": result["reason"],
            }
        )

    matches = _sort_job_matches(matches)

    return {
        "job_id": job["id"],
        "job_title": job["title"],
        "tagline": job["tagline"],
        "total_matches": len(matches),
        "matches": matches,
    }


@app.get(
    "/candidates/{candidate_id}/matches",
    summary="Get ranked job matches for a candidate",
    tags=["Matching"],
)
def get_matches_for_candidate(candidate_id: int) -> Dict[str, Any]:
    """
    Returns all jobs where the candidate has at least one skill overlap,
    ranked by the weighted scoring formula.
    """
    candidate = fetch_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=404, detail=f"Candidate {candidate_id} not found."
        )

    jobs = fetch_all_jobs()
    matches: List[Dict[str, Any]] = []

    for job in jobs:
        result = calculate_match(candidate, job)
        if result is None:
            continue

        matches.append(
            {
                "job_id": job["id"],
                "job_title": job["title"],
                "min_experience_years": job["min_experience_years"],
                "tagline": job["tagline"],
                "score": result["score"],
                "breakdown": result["breakdown"],
                "reason": result["reason"],
            }
        )

    matches = _sort_candidate_matches(matches)

    return {
        "candidate_id": candidate["id"],
        "candidate_name": candidate["name"],
        "quirk": candidate["quirk"],
        "total_matches": len(matches),
        "matches": matches,
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Meta"])
def health() -> Dict[str, str]:
    return {"status": "ok"}
