"""Export the warehouse result tables to a static JSON snapshot.

This lets the dashboard deploy with no database at all (for example a plain
Vercel deploy): when DATABASE_URL is unset, the web app reads this snapshot.
Regenerate it after each build with `athena snapshot`.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from .config import MODULE, REPO_ROOT
from .db import connect, fetch_all

OUT = REPO_ROOT / "web" / "data" / "snapshot.json"


def _clean(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (date, datetime)):
        return v.isoformat()[:10]
    return v


def _rows(conn, sql, params=None):
    return [{k: _clean(v) for k, v in r.items()} for r in fetch_all(conn, sql, params)]


def _grouped(rows, key):
    out = defaultdict(list)
    for r in rows:
        out[r[key]].append(r)
    return out


def export(module: str = MODULE) -> Path:
    with connect() as conn:
        kpis = _rows(conn, "SELECT metric_key, label, value, unit, delta, context FROM analytics_kpi WHERE module=%s ORDER BY metric_key", [module])
        series_rows = _rows(conn, "SELECT series_key, period, dimension, value FROM analytics_series WHERE module=%s ORDER BY id", [module])
        ranking_rows = _rows(conn, "SELECT ranking_key, entity, dimension, metric, secondary, rank FROM analytics_ranking WHERE module=%s ORDER BY rank", [module])
        forecast_rows = _rows(conn, "SELECT series_key, period, dimension, yhat, yhat_lower, yhat_upper, is_forecast FROM forecast_series WHERE module=%s ORDER BY period", [module])
        recs = _rows(conn, """SELECT recommendation_key, domain, title, observation, business_impact,
                    recommended_action, priority, confidence, evidence FROM recommendations WHERE module=%s
                    ORDER BY CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END, recommendation_key""", [module])

        # Scenario baseline (mirrors the web query).
        [agg] = _rows(conn, """
            WITH latest AS (
              SELECT f.*, s.prior_internship, ch.channel_type
              FROM fact_placement f
              JOIN dim_date d ON d.date_key=f.date_key
              JOIN dim_student s ON s.student_key=f.student_key
              JOIN dim_channel ch ON ch.channel_key=f.channel_key
              WHERE d.placement_cycle=(SELECT max(placement_cycle) FROM dim_date))
            SELECT 100.0*avg(is_placed) AS rate,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY ctc_lpa) FILTER (WHERE is_placed=1) AS ctc,
                   count(*) AS cohort,
                   100.0*avg((prior_internship)::int) AS intern,
                   100.0*avg((channel_type IN ('Institutional','Networked'))::int) AS channel
            FROM latest""")
        region = _rows(conn, "SELECT entity, metric FROM analytics_ranking WHERE module=%s AND ranking_key='region_placement_rate' ORDER BY rank LIMIT 1", [module])

    snapshot = {
        "module": module,
        "kpis": kpis,
        "series": _grouped(series_rows, "series_key"),
        "rankings": _grouped(ranking_rows, "ranking_key"),
        "forecasts": _grouped(forecast_rows, "series_key"),
        "recommendations": recs,
        "scenarioBaseline": {
            "placementRate": agg["rate"], "medianCtc": agg["ctc"], "cohort": agg["cohort"],
            "internCoverage": agg["intern"], "channelShare": agg["channel"],
            "weakRegion": region[0]["entity"] if region else "East",
            "weakRegionRate": region[0]["metric"] if region else 56,
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=2))
    return OUT
