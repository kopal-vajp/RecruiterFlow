-- ====================================================================
-- sql_detective.sql  — Part 2: The SQL Detective Challenge
-- Engine: SQLite ≥ 3.25  (also valid ANSI SQL / PostgreSQL compatible)
--
-- Run all 5 queries against the schema loaded from setup.sql:
--   sqlite3 detective.db < sql_detective/setup.sql
--   sqlite3 detective.db < sql_detective/sql_detective.sql
-- ====================================================================


-- ====================================================================
-- Question 1
-- List all currently OPEN job postings with the recruiter who owns each.
-- ====================================================================
--
-- Approach:
--   A plain INNER JOIN is correct here because every job_posting in our
--   dataset has a valid recruiter_id.  We use WHERE status = 'open' to
--   filter the three non-open postings (2× closed, 1× on_hold).
--
-- No trap — this is the warm-up.  Primary output column is jp.title,
-- not the generic id, to make the result human-readable.
-- ====================================================================

SELECT
    jp.id            AS job_posting_id,
    jp.title,
    jp.department,
    jp.opened_date,
    r.name           AS recruiter_name,
    r.region
FROM job_postings jp
JOIN recruiters r ON jp.recruiter_id = r.id
WHERE jp.status = 'open'
ORDER BY jp.id ASC;

-- Expected: job_postings 1, 2, 4, 5  (3 = closed, 6 = on_hold, 7 = closed)


-- ====================================================================
-- Question 2
-- For each job posting, how many applicants reached the Final stage?
-- ====================================================================
--
-- TRAP: Using an INNER JOIN would silently drop job postings that have
-- zero Final-stage interviews (e.g. job 5 DevOps Engineer — all its
-- interviews are Screen/Technical, none reached Final in the seed data).
--
-- Fix: LEFT JOIN from job_postings to interviews, filtering the join
-- condition (not the WHERE clause) so non-matching rows still appear as
-- NULLs rather than being excluded.  COUNT(DISTINCT i.applicant_id)
-- handles the edge case where the same applicant somehow has two Final
-- records for the same posting.
-- ====================================================================

SELECT
    jp.id                              AS job_posting_id,
    jp.title,
    jp.status,
    COUNT(DISTINCT i.applicant_id)     AS final_stage_applicants
FROM job_postings jp
LEFT JOIN interviews i
    ON  jp.id   = i.job_posting_id
    AND i.stage = 'Final'              -- filter ON the JOIN, not in WHERE!
GROUP BY jp.id, jp.title, jp.status
ORDER BY jp.id ASC;

-- ⚠  If you move "AND i.stage = 'Final'" into a WHERE clause, the LEFT JOIN
--    degrades to an INNER JOIN for those rows — job postings with no Final
--    interviews will vanish from the results.


-- ====================================================================
-- Question 3
-- Find people who applied to more than one job posting.
-- ====================================================================
--
-- TRAP: The applicants table has a deliberate data-quality problem.
--   applicant id=1 → 'ananya.rao@mail.com'   (lower-case, from LinkedIn)
--   applicant id=2 → 'Ananya.Rao@mail.com'   (mixed-case, from Referral)
-- Both represent the same person.  A naive GROUP BY applicant_id would
-- treat them as two different people and never see multi-job activity.
--
-- Fix: Normalise identity using LOWER(TRIM(email)) before grouping.
-- We then look up which distinct job_posting_ids each canonical email
-- appears in (via the interviews table — that is the authoritative record
-- of "applied"), and keep only those with > 1 distinct job.
--
-- Two-step CTE approach keeps each concern separate and readable.
-- ====================================================================

WITH normalized_applicants AS (
    -- Step 1: collapse every applicant row to a canonical email identity
    SELECT
        id              AS applicant_id,
        full_name,
        LOWER(TRIM(email)) AS canonical_email
    FROM applicants
),
applicant_job_map AS (
    -- Step 2: map each canonical identity → distinct jobs they appear in
    SELECT
        na.canonical_email,
        MIN(na.full_name)       AS person_name,   -- any version of name is fine
        i.job_posting_id
    FROM normalized_applicants na
    JOIN interviews i ON na.applicant_id = i.applicant_id
    GROUP BY na.canonical_email, i.job_posting_id -- one row per (person, job)
)
SELECT
    canonical_email,
    person_name,
    COUNT(DISTINCT job_posting_id) AS distinct_jobs_applied
FROM applicant_job_map
GROUP BY canonical_email
HAVING COUNT(DISTINCT job_posting_id) > 1
ORDER BY distinct_jobs_applied DESC, canonical_email ASC;

-- Expected: ananya.rao@mail.com (appeared in job 1 as id=1 AND job 4 as id=2)
--           ben.turner + elena.popescu also appeared in multiple jobs.


-- ====================================================================
-- Question 4
-- Final-stage conversion rate per recruiter (≥ 3 Final interviews only).
-- ====================================================================
--
-- TRAP 1: Integer division.
--   In SQLite, 2 / 3 = 0 (integer floor).  Multiplying the numerator by
--   1.0 forces a float division.  Alternatively use CAST(... AS REAL).
--   Using SUM(CASE WHEN outcome = 'passed' THEN 1.0 ELSE 0.0 END)
--   makes this explicit.
--
-- TRAP 2: NULL outcomes (pending interviews).
--   Interview id=22 has outcome = NULL (Isla Fraser, Technical, pending).
--   We join on i.stage = 'Final' so that specific row is excluded.
--   However: should pending Final interviews count in the denominator?
--   Decision: COUNT(i.id) counts ALL Final rows including pending ones,
--   which is the conservative/correct choice — a "pass rate" denominator
--   should reflect total opportunities, not just decided ones.
--   (If the brief prefers excluding NULLs, swap COUNT(i.id) for
--    COUNT(CASE WHEN i.outcome IS NOT NULL THEN 1 END).)
--
-- TRAP 3: HAVING threshold applies to Final-stage rows, not all interviews.
--   We JOIN on stage = 'Final' first, so the HAVING COUNT(i.id) >= 3
--   correctly counts only Final-stage rows per recruiter.
-- ====================================================================

SELECT
    r.id                                            AS recruiter_id,
    r.name                                          AS recruiter_name,
    COUNT(i.id)                                     AS total_final_interviews,
    SUM(CASE WHEN i.outcome = 'passed' THEN 1 ELSE 0 END)
                                                    AS passed_finals,
    ROUND(
        SUM(CASE WHEN i.outcome = 'passed' THEN 1.0 ELSE 0.0 END)
        / COUNT(i.id),
        3
    )                                               AS final_conversion_rate
FROM recruiters r
JOIN job_postings jp ON r.id  = jp.recruiter_id
JOIN interviews   i  ON jp.id = i.job_posting_id
WHERE i.stage = 'Final'
GROUP BY r.id, r.name
HAVING COUNT(i.id) >= 3
ORDER BY final_conversion_rate DESC, r.name ASC;

-- Expected: Priya Shah (job 1 + job 4) has 4 Finals: passed(Ananya), failed(Chloe),
--           passed(Grace), passed(Hassan) → 3/4 = 0.75
--           Daniel Ortiz (job 2 + job 7) has 4 Finals → verify against seed data


-- ====================================================================
-- Question 5 (Bonus)
-- Top recruiter per department by successful placements (Final + passed),
-- using a window function.
-- ====================================================================
--
-- TRAP 1: Using MAX() + GROUP BY instead of a window function will work
--   for finding the max count, but it cannot easily return the recruiter
--   name tied to that max without a second self-join or subquery.
--   RANK() OVER (PARTITION BY department ORDER BY successful_placements DESC)
--   is the clean, idiomatic solution.
--
-- TRAP 2: RANK() vs ROW_NUMBER() vs DENSE_RANK().
--   - ROW_NUMBER(): arbitrarily picks one row on ties — unfair.
--   - RANK(): skips ranks after ties (1,1,3) — correct for "top N" logic.
--   - DENSE_RANK(): does not skip (1,1,2) — also acceptable.
--   We use RANK() to return ALL tied top-performers per department.
--
-- TRAP 3: Partitioning correctly.
--   PARTITION BY department — NOT by recruiter.  We want one ranking
--   ladder per department, choosing the best recruiter within each.
-- ====================================================================

WITH department_placements AS (
    -- Aggregate: how many Final-passed interviews does each recruiter have
    -- within each department?
    SELECT
        jp.department,
        r.id            AS recruiter_id,
        r.name          AS recruiter_name,
        COUNT(i.id)     AS successful_placements
    FROM recruiters r
    JOIN job_postings jp ON r.id  = jp.recruiter_id
    JOIN interviews   i  ON jp.id = i.job_posting_id
    WHERE i.stage   = 'Final'
      AND i.outcome = 'passed'
    GROUP BY jp.department, r.id, r.name
),
ranked AS (
    -- Window function: rank recruiters within each department
    SELECT
        department,
        recruiter_id,
        recruiter_name,
        successful_placements,
        RANK() OVER (
            PARTITION BY department                   -- separate ladder per dept
            ORDER BY successful_placements DESC       -- highest placements = rank 1
        ) AS dept_rank
    FROM department_placements
)
SELECT
    department,
    recruiter_name,
    successful_placements
FROM ranked
WHERE dept_rank = 1                                   -- keep only the winner(s)
ORDER BY department ASC;

-- ⚠  If two recruiters in the same department have equal successful_placements,
--    RANK() will return both at rank=1 — intentionally correct behaviour.
