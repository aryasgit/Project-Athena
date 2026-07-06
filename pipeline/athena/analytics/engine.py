"""Analytics engine: KPIs, time series, and rankings written to result tables.

All computation is module-agnostic in shape; the placement semantics live in
the column names. Results land in analytics_kpi / analytics_series /
analytics_ranking for the dashboard to read.
"""

from __future__ import annotations

import pandas as pd

from ..config import MODULE
from ..db import connect
from ..warehouse import cycle_end_dates, load_facts, load_skills, ordered_cycles

PLACED = "is_placed == 1"


# --- result-table writers ---------------------------------------------------

def _reset(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("TRUNCATE analytics_kpi, analytics_series, analytics_ranking")


def _write_kpi(conn, key, label, value, unit=None, delta=None, context=None) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO analytics_kpi (metric_key, module, label, value, unit, delta, context)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (key, MODULE, label, float(value), unit,
             None if delta is None else float(delta), context),
        )


def _write_series(conn, series_key, records: list[dict]) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            """INSERT INTO analytics_series (series_key, module, period, dimension, value)
               VALUES (%s,%s,%s,%s,%s)""",
            [(series_key, MODULE, r.get("period"), r.get("dimension"), float(r["value"]))
             for r in records],
        )


def _write_ranking(conn, ranking_key, records: list[dict]) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            """INSERT INTO analytics_ranking
               (ranking_key, module, entity, dimension, metric, secondary, rank)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            [(ranking_key, MODULE, r["entity"], r.get("dimension"),
              float(r["metric"]),
              None if r.get("secondary") is None else float(r["secondary"]),
              int(r["rank"]))
             for r in records],
        )


# --- metrics ----------------------------------------------------------------

def _placement_rate(df: pd.DataFrame) -> float:
    return 100.0 * df["is_placed"].mean() if len(df) else 0.0


def _median_ctc(df: pd.DataFrame) -> float:
    placed = df.query(PLACED)
    return float(placed["ctc_lpa"].median()) if len(placed) else 0.0


def _kpis(conn, facts: pd.DataFrame, cycles: list[str]) -> None:
    latest, prior = cycles[-1], cycles[-2]
    cur_df = facts[facts.placement_cycle == latest]
    prev_df = facts[facts.placement_cycle == prior]

    rate, rate_prev = _placement_rate(cur_df), _placement_rate(prev_df)
    med, med_prev = _median_ctc(cur_df), _median_ctc(prev_df)
    placed_now = int(cur_df["is_placed"].sum())

    top_sector = (
        cur_df.query(PLACED).groupby("sector").size().sort_values(ascending=False)
    )
    avg_offers = float(cur_df.query(PLACED)["offers_received"].mean())

    _write_kpi(conn, "placement_rate", "Placement Rate", rate, "%",
               rate - rate_prev, f"Cycle {latest}")
    _write_kpi(conn, "median_ctc", "Median CTC", med, "LPA",
               med - med_prev, f"Cycle {latest}")
    _write_kpi(conn, "total_placements", "Students Placed", placed_now, "",
               placed_now - int(prev_df["is_placed"].sum()), f"Cycle {latest}")
    _write_kpi(conn, "avg_offers", "Avg Offers / Placed Student", avg_offers, "",
               None, f"Cycle {latest}")
    _write_kpi(conn, "top_sector_hiring", "Top Hiring Sector",
               float(top_sector.iloc[0]), "hires", None, top_sector.index[0])


def _series(conn, facts: pd.DataFrame, skills: pd.DataFrame, cycles: list[str]) -> None:
    ends = cycle_end_dates(facts)

    # Placement rate and median CTC by cycle.
    by_cycle = []
    ctc_cycle = []
    for c in cycles:
        d = facts[facts.placement_cycle == c]
        by_cycle.append({"period": ends[c].date(), "dimension": c, "value": _placement_rate(d)})
        ctc_cycle.append({"period": ends[c].date(), "dimension": c, "value": _median_ctc(d)})
    _write_series(conn, "placement_rate_by_cycle", by_cycle)
    _write_series(conn, "median_ctc_by_cycle", ctc_cycle)

    # Placement rate by university tier (latest cycle).
    latest = facts[facts.placement_cycle == cycles[-1]]
    tier = [{"dimension": t, "value": _placement_rate(g)}
            for t, g in latest.groupby("university_tier")]
    _write_series(conn, "placement_rate_by_tier", tier)

    # Median CTC by sector across cycles (reveals the declining sector).
    sect = []
    placed = facts.query(PLACED)
    for c in cycles:
        for s, g in placed[placed.placement_cycle == c].groupby("sector"):
            sect.append({"period": ends[c].date(), "dimension": f"{s}|{c}",
                         "value": float(g["ctc_lpa"].median())})
    _write_series(conn, "median_ctc_by_sector_cycle", sect)

    # Channel effectiveness (latest cycle): placement rate per channel.
    chan = [{"dimension": ch, "value": _placement_rate(g)}
            for ch, g in latest.groupby("channel_name")]
    _write_series(conn, "placement_rate_by_channel", chan)

    # Rising skill demand: share of placed students listing each rising skill.
    placed_counts = placed.groupby("placement_cycle").size()
    demand = []
    watch = ["Machine Learning", "AWS", "System Design", "Kubernetes", "SQL", "Python"]
    for c in cycles:
        total = placed_counts.get(c, 0)
        subset = skills[(skills.placement_cycle == c) & (skills.is_placed == 1)]
        counts = subset.groupby("skill_name").size()
        for sk in watch:
            share = 100.0 * counts.get(sk, 0) / total if total else 0.0
            demand.append({"period": ends[c].date(), "dimension": f"{sk}|{c}", "value": share})
    _write_series(conn, "skill_demand_by_cycle", demand)


def _rankings(conn, facts: pd.DataFrame, skills: pd.DataFrame, cycles: list[str]) -> None:
    latest = facts[facts.placement_cycle == cycles[-1]]
    placed = latest.query(PLACED)

    # Top universities by median CTC (min 15 placements to be meaningful).
    uni = placed.groupby("university").agg(
        median_ctc=("ctc_lpa", "median"), n=("ctc_lpa", "size"))
    uni_rate = latest.groupby("university")["is_placed"].mean() * 100
    uni = uni[uni.n >= 15].join(uni_rate.rename("rate"))
    uni = uni.sort_values("median_ctc", ascending=False).head(10).reset_index()
    _write_ranking(conn, "top_universities_by_salary", [
        {"entity": r.university, "metric": r.median_ctc, "secondary": r.rate, "rank": i + 1}
        for i, r in enumerate(uni.itertuples(index=False))
    ])

    # Skill salary premium: median CTC when a skill is present vs overall median.
    overall_median = placed["ctc_lpa"].median()
    sk_latest = skills[(skills.placement_cycle == cycles[-1]) & (skills.is_placed == 1)]
    prem = sk_latest.groupby("skill_name").agg(
        median_ctc=("ctc_lpa", "median"), n=("ctc_lpa", "size"))
    prem = prem[prem.n >= 30]
    prem["premium"] = 100.0 * (prem["median_ctc"] - overall_median) / overall_median
    prem = prem.sort_values("premium", ascending=False).head(10).reset_index()
    _write_ranking(conn, "skill_salary_premium", [
        {"entity": r.skill_name, "metric": r.premium, "secondary": r.median_ctc, "rank": i + 1}
        for i, r in enumerate(prem.itertuples(index=False))
    ])

    # Most in-demand skills (latest cycle share).
    total_placed = len(placed)
    demand = sk_latest.groupby("skill_name").size().sort_values(ascending=False).head(10)
    _write_ranking(conn, "most_demanded_skills", [
        {"entity": name, "metric": 100.0 * cnt / total_placed, "secondary": float(cnt),
         "rank": i + 1}
        for i, (name, cnt) in enumerate(demand.items())
    ])

    # Region placement rate (surfaces the weak region).
    region = (latest.groupby("region")["is_placed"].mean() * 100).sort_values()
    _write_ranking(conn, "region_placement_rate", [
        {"entity": name, "metric": val, "secondary": None, "rank": i + 1}
        for i, (name, val) in enumerate(region.items())
    ])

    # Channel effectiveness: placement rate + median CTC.
    chan = latest.groupby("channel_name").agg(
        rate=("is_placed", lambda s: 100.0 * s.mean()))
    chan_ctc = placed.groupby("channel_name")["ctc_lpa"].median()
    chan = chan.join(chan_ctc.rename("median_ctc")).sort_values("rate", ascending=False)
    chan = chan.reset_index()
    _write_ranking(conn, "channel_effectiveness", [
        {"entity": r.channel_name, "metric": r.rate, "secondary": r.median_ctc, "rank": i + 1}
        for i, r in enumerate(chan.itertuples(index=False))
    ])


def run_analytics() -> None:
    with connect() as conn:
        facts = load_facts(conn)
        skills = load_skills(conn)
        cycles = ordered_cycles(facts)
        _reset(conn)
        _kpis(conn, facts, cycles)
        _series(conn, facts, skills, cycles)
        _rankings(conn, facts, skills, cycles)
