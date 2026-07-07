"""ETL: load the generated CSVs into the Postgres star schema.

Dimensions with surrogate (SERIAL) keys are loaded on their natural columns;
the fact and bridge are then resolved from natural keys to surrogate keys.
"""

from __future__ import annotations

import pandas as pd
import psycopg

from .config import RAW_DIR, SQL_DIR
from .db import connect, copy_rows, execute_script


def _read(name: str) -> pd.DataFrame:
    return pd.read_csv(RAW_DIR / f"{name}.csv")


def _key_map(conn: psycopg.Connection, table: str, natural: str, surrogate: str) -> dict:
    with conn.cursor() as cur:
        cur.execute(f"SELECT {natural}, {surrogate} FROM {table}")
        return {row[0]: row[1] for row in cur.fetchall()}


def create_schema(conn: psycopg.Connection) -> None:
    execute_script(conn, (SQL_DIR / "schema.sql").read_text())


def load_dimensions(conn: psycopg.Connection) -> dict[str, dict]:
    """Load dimension tables and return natural-key -> surrogate-key maps."""
    # dim_date carries an explicit key.
    dd = _read("dim_date")
    copy_rows(
        conn, "dim_date",
        ["date_key", "full_date", "year", "quarter", "month", "month_name", "placement_cycle"],
        dd[["date_key", "full_date", "year", "quarter", "month", "month_name", "placement_cycle"]].itertuples(index=False, name=None),
    )

    du = _read("dim_university")
    copy_rows(conn, "dim_university",
              ["university_code", "name", "tier", "region", "established_year"],
              du.itertuples(index=False, name=None))

    dc = _read("dim_company")
    copy_rows(conn, "dim_company",
              ["company_code", "name", "sector", "company_tier"],
              dc.itertuples(index=False, name=None))

    dr = _read("dim_role")
    copy_rows(conn, "dim_role", ["title", "job_family", "seniority"],
              dr.itertuples(index=False, name=None))

    dch = _read("dim_channel")
    copy_rows(conn, "dim_channel", ["channel_name", "channel_type"],
              dch.itertuples(index=False, name=None))

    ds = _read("dim_student")
    copy_rows(conn, "dim_student",
              ["student_code", "gender", "degree", "major", "cgpa_band", "prior_internship"],
              ds.itertuples(index=False, name=None))

    dsk = _read("dim_skill")
    copy_rows(conn, "dim_skill", ["skill_name", "skill_category"],
              dsk.itertuples(index=False, name=None))

    return {
        "university": _key_map(conn, "dim_university", "university_code", "university_key"),
        "company": _key_map(conn, "dim_company", "company_code", "company_key"),
        "role": _key_map(conn, "dim_role", "title", "role_key"),
        "channel": _key_map(conn, "dim_channel", "channel_name", "channel_key"),
        "student": _key_map(conn, "dim_student", "student_code", "student_key"),
        "skill": _key_map(conn, "dim_skill", "skill_name", "skill_key"),
    }


def load_fact(conn: psycopg.Connection, maps: dict[str, dict]) -> None:
    fact = _read("fact_placement")

    def opt(m: dict, v):
        return None if pd.isna(v) else m[v]

    rows = []
    for r in fact.itertuples(index=False):
        rows.append((
            int(r.date_key),
            maps["university"][r.university_code],
            opt(maps["company"], r.company_code),
            opt(maps["role"], r.role_title),
            maps["channel"][r.channel_name],
            maps["student"][r.student_code],
            int(r.is_placed),
            None if pd.isna(r.ctc_lpa) else float(r.ctc_lpa),
            None if pd.isna(r.interview_rounds) else int(r.interview_rounds),
            int(r.offers_received),
            None if pd.isna(r.days_to_offer) else int(r.days_to_offer),
        ))
    copy_rows(
        conn, "fact_placement",
        ["date_key", "university_key", "company_key", "role_key", "channel_key",
         "student_key", "is_placed", "ctc_lpa", "interview_rounds",
         "offers_received", "days_to_offer"],
        rows,
    )


def load_bridge(conn: psycopg.Connection, maps: dict[str, dict]) -> None:
    # Resolve student_code -> placement_key (one fact row per student).
    with conn.cursor() as cur:
        cur.execute("""
            SELECT s.student_code, f.placement_key
            FROM fact_placement f
            JOIN dim_student s ON s.student_key = f.student_key
        """)
        placement_by_student = {row[0]: row[1] for row in cur.fetchall()}

    bridge = _read("bridge_placement_skill")
    rows = []
    for r in bridge.itertuples(index=False):
        pk = placement_by_student.get(r.student_code)
        if pk is not None:
            rows.append((pk, maps["skill"][r.skill_name]))
    copy_rows(conn, "bridge_placement_skill", ["placement_key", "skill_key"], rows)


def ingest() -> None:
    with connect() as conn:
        create_schema(conn)
        maps = load_dimensions(conn)
        load_fact(conn, maps)
        load_bridge(conn, maps)
