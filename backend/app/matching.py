"""
matching.py — Pure scoring engine. Zero database access.

All scoring logic lives here so it can be tested without a running DB.
Weights and multipliers are module-level constants to make tuning trivial.

Scoring formula
---------------
  raw_score = (skill_score   * WEIGHT_SKILL)
             + (exp_score    * WEIGHT_EXPERIENCE)
             + (culture_score * WEIGHT_CULTURE)

  final_score = round(raw_score * availability_multiplier * 100, 2)

Disqualification rule
---------------------
  Any candidate with ZERO skill overlap is excluded entirely (returns None).

Tie-breaking (applied externally by the caller, documented here for clarity)
-------------
  Primary  : score DESC
  Secondary: experience_years DESC
  Tertiary : candidate name ASC (alphabetical)
"""

from typing import Dict, Any, Optional

# ---------------------------------------------------------------------------
# Configurable weight constants — change here to tune the algorithm globally
# ---------------------------------------------------------------------------
WEIGHT_SKILL: float = 0.60        # Skill overlap carries the most weight
WEIGHT_EXPERIENCE: float = 0.30   # Meeting/exceeding experience floor
WEIGHT_CULTURE: float = 0.10      # Culture / trait alignment

# Availability multipliers — penalise candidates who are hard to onboard quickly
AVAILABILITY_MULTIPLIERS: Dict[str, float] = {
    "Immediate": 1.0,    # No penalty: available now
    "2 weeks": 0.90,     # Minor penalty: standard notice period
    "Not looking": 0.60, # Heavy penalty: passive candidate, harder to close
}

_DEFAULT_AVAILABILITY_MULTIPLIER: float = 0.75  # Fallback for unexpected values


def _skill_score(candidate_skills: set, required_skills: set) -> float:
    """Fraction of required skills the candidate possesses (0.0 – 1.0)."""
    if not required_skills:
        return 1.0
    return len(candidate_skills & required_skills) / len(required_skills)


def _experience_score(candidate_years: int, min_years: int) -> float:
    """
    1.0 if candidate meets or exceeds the floor.
    Proportional fraction otherwise — we don't hard-exclude under-experienced
    candidates so that near-misses still appear (ranked lower).
    """
    if min_years <= 0:
        return 1.0
    if candidate_years >= min_years:
        return 1.0
    return candidate_years / min_years


def _culture_score(candidate_traits: set, culture_keywords: set) -> float:
    """Fraction of culture keywords matched by candidate traits (0.0 – 1.0)."""
    if not culture_keywords:
        return 1.0
    return len(candidate_traits & culture_keywords) / len(culture_keywords)


def calculate_match(
    candidate: Dict[str, Any],
    job: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Score a single candidate against a single job.

    Returns None if the candidate has zero skill overlap with the job
    (hard disqualification rule).

    Returns a dict with:
      - score            : float (0–100), the final weighted + availability-adjusted score
      - breakdown        : sub-scores for debugging / display
      - reason           : human-readable string explaining the score
    """
    candidate_skills = set(candidate.get("skills", []))
    required_skills = set(job.get("required_skills", []))

    matched_skills = candidate_skills & required_skills

    # Hard disqualification: zero skill overlap
    if not matched_skills:
        return None

    s_score = _skill_score(candidate_skills, required_skills)
    e_score = _experience_score(
        candidate.get("experience_years", 0),
        job.get("min_experience_years", 0),
    )
    c_score = _culture_score(
        set(candidate.get("traits", [])),
        set(job.get("culture_keywords", [])),
    )

    raw_score = (
        s_score * WEIGHT_SKILL
        + e_score * WEIGHT_EXPERIENCE
        + c_score * WEIGHT_CULTURE
    )

    availability = candidate.get("availability", "Immediate")
    avail_multiplier = AVAILABILITY_MULTIPLIERS.get(
        availability, _DEFAULT_AVAILABILITY_MULTIPLIER
    )
    final_score = round(raw_score * avail_multiplier * 100, 2)

    # -----------------------------------------------------------------------
    # Build a human-readable reason string (shown in API responses)
    # -----------------------------------------------------------------------
    cand_exp = candidate.get("experience_years", 0)
    min_exp = job.get("min_experience_years", 0)
    matched_culture = set(candidate.get("traits", [])) & set(job.get("culture_keywords", []))

    reasons: list[str] = [
        f"Matches {len(matched_skills)}/{len(required_skills)} required skill(s): "
        f"{', '.join(sorted(matched_skills))}"
    ]

    if cand_exp >= min_exp:
        reasons.append(
            f"Meets experience requirement ({cand_exp}y >= {min_exp}y required)"
        )
    else:
        reasons.append(
            f"Below experience floor ({cand_exp}y < {min_exp}y required)"
        )

    if matched_culture:
        reasons.append(
            f"Culture match on: {', '.join(sorted(matched_culture))}"
        )
    else:
        reasons.append("No culture trait overlap")

    if avail_multiplier < 1.0:
        reasons.append(
            f"Availability '{availability}' applies x{avail_multiplier} score multiplier"
        )

    return {
        "score": final_score,
        "breakdown": {
            "skill_score": round(s_score, 4),
            "experience_score": round(e_score, 4),
            "culture_score": round(c_score, 4),
            "availability_multiplier": avail_multiplier,
        },
        "reason": ". ".join(reasons) + ".",
    }
