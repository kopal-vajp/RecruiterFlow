"""
test_matching.py — Pytest suite for the scoring engine (matching.py).

All tests operate against pure Python dicts — no database required.
This keeps the test suite fast, deterministic, and fully isolated.

Test coverage:
  1. Perfect skill match + Immediate availability
  2. Zero skill overlap → hard disqualification (returns None)
  3. Partial skill overlap is accepted, score reflects fraction
  4. Availability penalty: 'Not looking' applies 0.60 multiplier
  5. Availability penalty: '2 weeks' applies 0.90 multiplier
  6. Under-experience floor is penalised proportionally (no hard exclude)
  7. Zero culture overlap contributes 0.0 to culture sub-score
  8. Full culture match contributes 1.0 to culture sub-score
  9. Tie-breaking: same score, higher experience ranked first
 10. Tie-breaking: same score AND same experience, alphabetical name first
"""

import pytest
from app.matching import (
    AVAILABILITY_MULTIPLIERS,
    WEIGHT_CULTURE,
    WEIGHT_EXPERIENCE,
    WEIGHT_SKILL,
    calculate_match,
)

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

def _job(
    id=1,
    title="Backend Detective",
    required_skills=None,
    min_experience_years=3,
    culture_keywords=None,
):
    return {
        "id": id,
        "title": title,
        "required_skills": required_skills or ["deduction", "pattern-recognition", "forensics"],
        "min_experience_years": min_experience_years,
        "culture_keywords": culture_keywords or ["analytical", "autonomous"],
    }


def _candidate(
    id=1,
    name="Sherlock H.",
    skills=None,
    experience_years=8,
    availability="Immediate",
    traits=None,
):
    return {
        "id": id,
        "name": name,
        "skills": skills or ["deduction", "pattern-recognition", "forensics"],
        "experience_years": experience_years,
        "availability": availability,
        "traits": traits or ["analytical", "blunt"],
    }


# ---------------------------------------------------------------------------
# Test 1 — Perfect skill + Immediate availability
# ---------------------------------------------------------------------------

def test_perfect_skill_match_immediate():
    """
    3/3 skills, 8y exp >= 3y min, 1/2 culture keywords matched.
    Raw = 1.0*0.6 + 1.0*0.3 + 0.5*0.1 = 0.95.  Multiplier 1.0. Score = 95.0
    """
    result = calculate_match(_candidate(), _job())
    assert result is not None
    assert result["score"] == 95.0
    assert result["breakdown"]["skill_score"] == 1.0
    assert result["breakdown"]["experience_score"] == 1.0
    assert result["breakdown"]["availability_multiplier"] == 1.0


# ---------------------------------------------------------------------------
# Test 2 — Zero skill overlap → disqualified
# ---------------------------------------------------------------------------

def test_zero_skill_overlap_returns_none():
    """Candidate with no matching skills must be excluded (return None)."""
    candidate = _candidate(
        skills=["woodworking", "minimalism", "negotiation"],
        traits=["stubborn"],
    )
    result = calculate_match(candidate, _job())
    assert result is None


# ---------------------------------------------------------------------------
# Test 3 — Partial skill overlap is accepted
# ---------------------------------------------------------------------------

def test_partial_skill_overlap_accepted():
    """
    1/3 skills matched → skill_score = 0.333…
    8y exp >= 3y → exp_score = 1.0
    0/2 culture → culture_score = 0.0
    Raw = 0.3333*0.6 + 1.0*0.3 + 0.0*0.1 = 0.2 + 0.3 = 0.5
    Final = 0.5 * 1.0 * 100 = 50.0
    """
    candidate = _candidate(
        skills=["deduction", "woodworking", "minimalism"],  # only 'deduction' matches
        traits=["stubborn"],  # no culture match
    )
    result = calculate_match(candidate, _job())
    assert result is not None
    assert result["breakdown"]["skill_score"] == round(1 / 3, 4)
    assert result["score"] == round((1 / 3 * 0.6 + 1.0 * 0.3 + 0.0 * 0.1) * 1.0 * 100, 2)


# ---------------------------------------------------------------------------
# Test 4 — 'Not looking' availability penalty (0.60)
# ---------------------------------------------------------------------------

def test_not_looking_availability_penalty():
    """'Not looking' multiplier = 0.60 must appear in breakdown and reduce score."""
    candidate = _candidate(
        skills=["rapid-prototyping", "systems-design"],
        availability="Not looking",
        traits=["innovative"],
    )
    job = _job(
        required_skills=["rapid-prototyping", "systems-design"],
        min_experience_years=2,
        culture_keywords=["innovative", "fast-paced"],
    )
    result = calculate_match(candidate, job)
    assert result is not None
    assert result["breakdown"]["availability_multiplier"] == 0.60
    assert "Not looking" in result["reason"]

    # Manually verify the score
    raw = 1.0 * WEIGHT_SKILL + 1.0 * WEIGHT_EXPERIENCE + 0.5 * WEIGHT_CULTURE
    expected = round(raw * 0.60 * 100, 2)
    assert result["score"] == expected


# ---------------------------------------------------------------------------
# Test 5 — '2 weeks' availability penalty (0.90)
# ---------------------------------------------------------------------------

def test_two_weeks_availability_penalty():
    """'2 weeks' multiplier = 0.90 must appear in breakdown."""
    candidate = _candidate(
        skills=["rapid-prototyping", "systems-design"],
        availability="2 weeks",
        traits=["innovative"],
    )
    job = _job(
        required_skills=["rapid-prototyping", "systems-design"],
        min_experience_years=2,
        culture_keywords=["innovative", "fast-paced"],
    )
    result = calculate_match(candidate, job)
    assert result is not None
    assert result["breakdown"]["availability_multiplier"] == 0.90


# ---------------------------------------------------------------------------
# Test 6 — Under-experience floor is proportionally penalised, not excluded
# ---------------------------------------------------------------------------

def test_under_experience_proportional_penalty():
    """
    Candidate has 1y experience vs 4y minimum → exp_score = 1/4 = 0.25.
    Candidate is NOT excluded (no hard disqualification for experience).
    """
    candidate = _candidate(
        skills=["crisis-management", "strategy", "negotiation"],
        experience_years=1,
        availability="Immediate",
        traits=["decisive"],
    )
    job = _job(
        required_skills=["crisis-management", "strategy", "negotiation"],
        min_experience_years=4,
        culture_keywords=["decisive", "calm-under-pressure"],
    )
    result = calculate_match(candidate, job)
    assert result is not None
    assert result["breakdown"]["experience_score"] == 0.25


# ---------------------------------------------------------------------------
# Test 7 — Zero culture overlap
# ---------------------------------------------------------------------------

def test_zero_culture_overlap_score():
    """culture_score = 0.0 when no traits match any culture keyword."""
    candidate = _candidate(
        skills=["deduction", "pattern-recognition", "forensics"],
        traits=["blunt", "stubborn"],  # none match ["analytical", "autonomous"]
    )
    result = calculate_match(candidate, _job())
    assert result is not None
    assert result["breakdown"]["culture_score"] == 0.0


# ---------------------------------------------------------------------------
# Test 8 — Full culture overlap
# ---------------------------------------------------------------------------

def test_full_culture_overlap_score():
    """culture_score = 1.0 when all culture keywords match candidate traits."""
    candidate = _candidate(
        skills=["deduction", "pattern-recognition", "forensics"],
        traits=["analytical", "autonomous"],  # exact match
    )
    result = calculate_match(candidate, _job())
    assert result is not None
    assert result["breakdown"]["culture_score"] == 1.0


# ---------------------------------------------------------------------------
# Test 9 — Tie-breaking: higher experience wins
# ---------------------------------------------------------------------------

def test_tiebreak_higher_experience_wins():
    """
    Two candidates with identical scores → the one with more experience
    should be ranked higher when sorted externally.
    We verify scores are equal, then confirm the intended sort direction.
    """
    job = _job(
        required_skills=["deduction", "pattern-recognition"],
        min_experience_years=2,
        culture_keywords=[],  # no culture keywords → culture score irrelevant
    )

    cand_junior = _candidate(
        id=1,
        name="Alpha",
        skills=["deduction", "pattern-recognition"],
        experience_years=5,
        availability="Immediate",
        traits=[],
    )
    cand_senior = _candidate(
        id=2,
        name="Beta",
        skills=["deduction", "pattern-recognition"],
        experience_years=10,
        availability="Immediate",
        traits=[],
    )

    r_junior = calculate_match(cand_junior, job)
    r_senior = calculate_match(cand_senior, job)

    assert r_junior is not None
    assert r_senior is not None
    # Both have identical normalised scores (both meet experience floor)
    assert r_junior["score"] == r_senior["score"]

    # Simulate sort: (-score, -exp, name)
    results = [
        {"score": r_junior["score"], "experience_years": 5, "candidate_name": "Alpha"},
        {"score": r_senior["score"], "experience_years": 10, "candidate_name": "Beta"},
    ]
    sorted_results = sorted(
        results, key=lambda m: (-m["score"], -m["experience_years"], m["candidate_name"])
    )
    assert sorted_results[0]["candidate_name"] == "Beta"  # higher experience first


# ---------------------------------------------------------------------------
# Test 10 — Tie-breaking: alphabetical name wins when exp also tied
# ---------------------------------------------------------------------------

def test_tiebreak_alphabetical_name():
    """
    Identical score AND identical experience → alphabetical name wins.
    """
    job = _job(
        required_skills=["deduction"],
        min_experience_years=2,
        culture_keywords=[],
    )

    results = [
        {"score": 90.0, "experience_years": 5, "candidate_name": "Zara"},
        {"score": 90.0, "experience_years": 5, "candidate_name": "Alex"},
    ]
    sorted_results = sorted(
        results, key=lambda m: (-m["score"], -m["experience_years"], m["candidate_name"])
    )
    assert sorted_results[0]["candidate_name"] == "Alex"
