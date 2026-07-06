-- Athena warehouse schema (Placement Intelligence module).
-- Star schema for the facts, plus result tables the dashboard reads from.
-- Rebuild is idempotent: everything is dropped and recreated.

DROP TABLE IF EXISTS bridge_placement_skill CASCADE;
DROP TABLE IF EXISTS fact_placement CASCADE;
DROP TABLE IF EXISTS dim_date CASCADE;
DROP TABLE IF EXISTS dim_university CASCADE;
DROP TABLE IF EXISTS dim_company CASCADE;
DROP TABLE IF EXISTS dim_role CASCADE;
DROP TABLE IF EXISTS dim_channel CASCADE;
DROP TABLE IF EXISTS dim_student CASCADE;
DROP TABLE IF EXISTS dim_skill CASCADE;

DROP TABLE IF EXISTS analytics_kpi CASCADE;
DROP TABLE IF EXISTS analytics_series CASCADE;
DROP TABLE IF EXISTS analytics_ranking CASCADE;
DROP TABLE IF EXISTS forecast_series CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;

-- Dimensions ---------------------------------------------------------------

CREATE TABLE dim_date (
    date_key        INTEGER PRIMARY KEY,   -- yyyymmdd
    full_date       DATE NOT NULL,
    year            INTEGER NOT NULL,
    quarter         INTEGER NOT NULL,
    month           INTEGER NOT NULL,
    month_name      TEXT NOT NULL,
    placement_cycle TEXT NOT NULL          -- e.g. "2023-24"
);

CREATE TABLE dim_university (
    university_key   SERIAL PRIMARY KEY,
    university_code  TEXT UNIQUE NOT NULL,
    name             TEXT NOT NULL,
    tier             TEXT NOT NULL,         -- Tier-1 / Tier-2 / Tier-3
    region           TEXT NOT NULL,
    established_year INTEGER
);

CREATE TABLE dim_company (
    company_key   SERIAL PRIMARY KEY,
    company_code  TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    sector        TEXT NOT NULL,            -- Software / Finance / Consulting / ...
    company_tier  TEXT NOT NULL            -- Global MNC / Product / Service / Startup
);

CREATE TABLE dim_role (
    role_key   SERIAL PRIMARY KEY,
    title      TEXT UNIQUE NOT NULL,
    job_family TEXT NOT NULL,               -- Engineering / Data / Analyst / ...
    seniority  TEXT NOT NULL               -- Entry / Associate
);

CREATE TABLE dim_channel (
    channel_key  SERIAL PRIMARY KEY,
    channel_name TEXT UNIQUE NOT NULL,      -- On-Campus / Referral / Job Portal / ...
    channel_type TEXT NOT NULL             -- Institutional / Networked / Open Market
);

CREATE TABLE dim_student (
    student_key       SERIAL PRIMARY KEY,
    student_code      TEXT UNIQUE NOT NULL,
    gender            TEXT NOT NULL,
    degree            TEXT NOT NULL,        -- B.Tech / M.Tech / MBA / ...
    major             TEXT NOT NULL,
    cgpa_band         TEXT NOT NULL,        -- <7 / 7-8 / 8-9 / 9+
    prior_internship  BOOLEAN NOT NULL
);

CREATE TABLE dim_skill (
    skill_key      SERIAL PRIMARY KEY,
    skill_name     TEXT UNIQUE NOT NULL,
    skill_category TEXT NOT NULL           -- Programming / Data / Cloud / Soft / ...
);

-- Fact ---------------------------------------------------------------------

CREATE TABLE fact_placement (
    placement_key    BIGSERIAL PRIMARY KEY,
    date_key         INTEGER NOT NULL REFERENCES dim_date(date_key),
    university_key   INTEGER NOT NULL REFERENCES dim_university(university_key),
    company_key      INTEGER REFERENCES dim_company(company_key),
    role_key         INTEGER REFERENCES dim_role(role_key),
    channel_key      INTEGER NOT NULL REFERENCES dim_channel(channel_key),
    student_key      INTEGER NOT NULL REFERENCES dim_student(student_key),
    is_placed        SMALLINT NOT NULL,     -- 1 placed, 0 not placed
    ctc_lpa          NUMERIC(6,2),          -- annual CTC in lakhs; null when not placed
    interview_rounds INTEGER,
    offers_received  INTEGER NOT NULL DEFAULT 0,
    days_to_offer    INTEGER
);

CREATE INDEX idx_fact_date ON fact_placement(date_key);
CREATE INDEX idx_fact_university ON fact_placement(university_key);
CREATE INDEX idx_fact_company ON fact_placement(company_key);
CREATE INDEX idx_fact_channel ON fact_placement(channel_key);

CREATE TABLE bridge_placement_skill (
    placement_key BIGINT NOT NULL REFERENCES fact_placement(placement_key),
    skill_key     INTEGER NOT NULL REFERENCES dim_skill(skill_key),
    PRIMARY KEY (placement_key, skill_key)
);

-- Result tables (populated by analytics / forecast / recommend) -------------

CREATE TABLE analytics_kpi (
    metric_key TEXT PRIMARY KEY,
    module     TEXT NOT NULL,
    label      TEXT NOT NULL,
    value      NUMERIC NOT NULL,
    unit       TEXT,
    delta      NUMERIC,               -- change vs prior cycle, if applicable
    context    TEXT
);

CREATE TABLE analytics_series (
    id         BIGSERIAL PRIMARY KEY,
    series_key TEXT NOT NULL,         -- e.g. "placements_by_cycle"
    module     TEXT NOT NULL,
    period     DATE,
    dimension  TEXT,                  -- grouping label, e.g. sector or university
    value      NUMERIC NOT NULL
);
CREATE INDEX idx_series_key ON analytics_series(series_key);

CREATE TABLE analytics_ranking (
    id          BIGSERIAL PRIMARY KEY,
    ranking_key TEXT NOT NULL,        -- e.g. "top_universities_by_salary"
    module      TEXT NOT NULL,
    entity      TEXT NOT NULL,
    dimension   TEXT,
    metric      NUMERIC NOT NULL,
    secondary   NUMERIC,
    rank        INTEGER NOT NULL
);
CREATE INDEX idx_ranking_key ON analytics_ranking(ranking_key);

CREATE TABLE forecast_series (
    id          BIGSERIAL PRIMARY KEY,
    series_key  TEXT NOT NULL,
    module      TEXT NOT NULL,
    period      DATE NOT NULL,
    dimension   TEXT,
    yhat        NUMERIC NOT NULL,
    yhat_lower  NUMERIC,
    yhat_upper  NUMERIC,
    is_forecast BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_forecast_key ON forecast_series(series_key);

CREATE TABLE recommendations (
    recommendation_key SERIAL PRIMARY KEY,
    module             TEXT NOT NULL,
    domain             TEXT NOT NULL,   -- Executive / HR / Finance / Operations / Marketing
    title              TEXT NOT NULL,
    observation        TEXT NOT NULL,
    business_impact    TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    priority           TEXT NOT NULL,   -- High / Medium / Low
    confidence         NUMERIC,         -- 0..1
    evidence           JSONB
);
