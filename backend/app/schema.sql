DROP TABLE IF EXISTS candidate_traits;
DROP TABLE IF EXISTS candidate_skills;
DROP TABLE IF EXISTS job_culture_keywords;
DROP TABLE IF EXISTS job_skills;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS jobs;

CREATE TABLE candidates (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    experience_years INTEGER NOT NULL,
    availability TEXT NOT NULL CHECK(availability IN ('Immediate', '2 weeks', 'Not looking')),
    quirk TEXT NOT NULL
);

CREATE TABLE candidate_skills (
    candidate_id INTEGER NOT NULL,
    skill TEXT NOT NULL,
    PRIMARY KEY (candidate_id, skill),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE TABLE candidate_traits (
    candidate_id INTEGER NOT NULL,
    trait TEXT NOT NULL,
    PRIMARY KEY (candidate_id, trait),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE TABLE jobs (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    min_experience_years INTEGER NOT NULL,
    tagline TEXT NOT NULL
);

CREATE TABLE job_skills (
    job_id INTEGER NOT NULL,
    skill TEXT NOT NULL,
    PRIMARY KEY (job_id, skill),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE job_culture_keywords (
    job_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    PRIMARY KEY (job_id, keyword),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Indexes to speed up skill-based JOIN queries used in matching
CREATE INDEX idx_candidate_skills_skill ON candidate_skills(skill);
CREATE INDEX idx_job_skills_skill ON job_skills(skill);
