"""Read the warehouse result tables into plain dicts for the API responses."""

from __future__ import annotations

from athena.config import MODULE
from athena.db import fetch_all


def kpis(conn, module=MODULE):
    return fetch_all(conn, """
        SELECT metric_key, label, value::float AS value, unit,
               delta::float AS delta, context
        FROM analytics_kpi WHERE module = %s ORDER BY metric_key""", [module])


def ranking(conn, ranking_key, module=MODULE):
    return fetch_all(conn, """
        SELECT entity, dimension, metric::float AS metric,
               secondary::float AS secondary, rank
        FROM analytics_ranking WHERE module = %s AND ranking_key = %s
        ORDER BY rank""", [module, ranking_key])


def series(conn, series_key, module=MODULE):
    return fetch_all(conn, """
        SELECT period, dimension, value::float AS value
        FROM analytics_series WHERE module = %s AND series_key = %s ORDER BY id""",
        [module, series_key])


def forecast(conn, series_key, module=MODULE):
    return fetch_all(conn, """
        SELECT period, dimension, yhat::float AS yhat,
               yhat_lower::float AS yhat_lower, yhat_upper::float AS yhat_upper,
               is_forecast
        FROM forecast_series WHERE module = %s AND series_key = %s ORDER BY period""",
        [module, series_key])


def recommendations(conn, module=MODULE):
    return fetch_all(conn, """
        SELECT recommendation_key, domain, title, observation, business_impact,
               recommended_action, priority, confidence::float AS confidence, evidence
        FROM recommendations WHERE module = %s
        ORDER BY CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
                 recommendation_key""", [module])


def analytics_bundle(conn, module=MODULE):
    """Everything a consumer needs in one structured payload."""
    return {
        "module": module,
        "kpis": kpis(conn, module),
        "rankings": {
            "skill_salary_premium": ranking(conn, "skill_salary_premium", module),
            "most_demanded_skills": ranking(conn, "most_demanded_skills", module),
            "region_placement_rate": ranking(conn, "region_placement_rate", module),
            "channel_effectiveness": ranking(conn, "channel_effectiveness", module),
            "top_universities_by_salary": ranking(conn, "top_universities_by_salary", module),
        },
        "forecast": {
            "median_ctc_cycle": forecast(conn, "median_ctc_cycle", module),
            "placements_monthly": forecast(conn, "placements_monthly", module),
        },
        "recommendations": recommendations(conn, module),
    }
