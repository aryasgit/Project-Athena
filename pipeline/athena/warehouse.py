"""Read helpers that pull the star schema into analysis-ready frames."""

from __future__ import annotations

import pandas as pd
import psycopg

# One denormalized row per placement record (placed or not).
FACT_QUERY = """
SELECT
    f.placement_key,
    d.placement_cycle,
    d.full_date,
    d.year,
    u.name        AS university,
    u.tier        AS university_tier,
    u.region,
    c.sector,
    c.company_tier,
    r.title       AS role,
    r.job_family,
    ch.channel_name,
    ch.channel_type,
    s.gender,
    s.degree,
    s.major,
    s.cgpa_band,
    s.prior_internship,
    f.is_placed,
    f.ctc_lpa,
    f.interview_rounds,
    f.offers_received,
    f.days_to_offer
FROM fact_placement f
JOIN dim_date d       ON d.date_key = f.date_key
JOIN dim_university u  ON u.university_key = f.university_key
JOIN dim_student s     ON s.student_key = f.student_key
JOIN dim_channel ch    ON ch.channel_key = f.channel_key
LEFT JOIN dim_company c ON c.company_key = f.company_key
LEFT JOIN dim_role r    ON r.role_key = f.role_key
"""

SKILL_QUERY = """
SELECT
    f.placement_key,
    d.placement_cycle,
    u.tier   AS university_tier,
    f.is_placed,
    f.ctc_lpa,
    sk.skill_name,
    sk.skill_category
FROM bridge_placement_skill b
JOIN dim_skill sk      ON sk.skill_key = b.skill_key
JOIN fact_placement f  ON f.placement_key = b.placement_key
JOIN dim_date d        ON d.date_key = f.date_key
JOIN dim_university u   ON u.university_key = f.university_key
"""


def _frame(conn: psycopg.Connection, sql: str) -> pd.DataFrame:
    with conn.cursor() as cur:
        cur.execute(sql)
        cols = [d.name for d in cur.description]
        rows = cur.fetchall()
    return pd.DataFrame(rows, columns=cols)


def load_facts(conn: psycopg.Connection) -> pd.DataFrame:
    df = _frame(conn, FACT_QUERY)
    df["full_date"] = pd.to_datetime(df["full_date"])
    df["ctc_lpa"] = pd.to_numeric(df["ctc_lpa"], errors="coerce")
    return df


def load_skills(conn: psycopg.Connection) -> pd.DataFrame:
    df = _frame(conn, SKILL_QUERY)
    df["ctc_lpa"] = pd.to_numeric(df["ctc_lpa"], errors="coerce")
    return df


def cycle_end_dates(facts: pd.DataFrame) -> dict[str, pd.Timestamp]:
    """Representative date per cycle (its last month) for plotting series."""
    return facts.groupby("placement_cycle")["full_date"].max().to_dict()


def ordered_cycles(facts: pd.DataFrame) -> list[str]:
    return sorted(facts["placement_cycle"].unique())
