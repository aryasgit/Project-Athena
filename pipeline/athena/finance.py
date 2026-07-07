"""Finance Intelligence module.

Demonstrates the "one engine, many datasets" claim: this writes into the same
result tables the dashboard reads (analytics_kpi / analytics_series /
analytics_ranking / forecast_series / recommendations) but under
module = 'finance', reusing the generic series/ranking "slots" so the existing
dashboard renders it with finance labels.

Signal is embedded so the recommendations are real: a declining, low-margin
product line (Legacy Licensing), a structurally weak region (East), a
margin-negative channel (Reseller), and a high-growth high-margin segment
(Cloud Platform).
"""

from __future__ import annotations

import json

import numpy as np

from .config import RANDOM_SEED
from .db import connect

MODULE = "finance"

# base revenue in ₹ crore (latest-year scale), annual growth, gross margin
SEGMENTS = {
    "Cloud Platform": {"base": 300, "growth": 0.16, "margin": 0.62},
    "Enterprise Software": {"base": 340, "growth": 0.06, "margin": 0.57},
    "Payments": {"base": 210, "growth": 0.12, "margin": 0.33},
    "Data Services": {"base": 150, "growth": 0.10, "margin": 0.47},
    "Legacy Licensing": {"base": 430, "growth": -0.10, "margin": 0.21},  # declining drag
}
REGIONS = {"North": 1.00, "South": 1.06, "West": 1.03, "East": 0.80, "Central": 0.96}
CHANNELS = {  # margin adjustment vs blended
    "Direct Sales": 0.06, "Online": 0.09, "Partner": 0.00, "Reseller": -0.05,
}
YEARS = ["2022", "2023", "2024"]
OPEX_RATE = 0.28  # operating expense as share of revenue


def _year_end(y: str) -> str:
    return f"{y}-12-31"


def _segment_revenue(rng, seg, year_idx):
    cfg = SEGMENTS[seg]
    return cfg["base"] * ((1 + cfg["growth"]) ** (year_idx - (len(YEARS) - 1))) * rng.lognormal(0, 0.03)


def _reset(conn):
    with conn.cursor() as cur:
        for t in ("analytics_kpi", "analytics_series", "analytics_ranking", "forecast_series"):
            cur.execute(f"DELETE FROM {t} WHERE module = %s", (MODULE,))
        cur.execute("DELETE FROM recommendations WHERE module = %s", (MODULE,))


def _kpi(conn, key, label, value, unit=None, delta=None, context=None):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO analytics_kpi (metric_key, module, label, value, unit, delta, context)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (key, MODULE, label, float(value), unit, None if delta is None else float(delta), context))


def _series(conn, key, rows):
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO analytics_series (series_key, module, period, dimension, value)"
            " VALUES (%s,%s,%s,%s,%s)",
            [(key, MODULE, r.get("period"), r.get("dimension"), float(r["value"])) for r in rows])


def _ranking(conn, key, rows):
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO analytics_ranking (ranking_key, module, entity, dimension, metric, secondary, rank)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s)",
            [(key, MODULE, r["entity"], r.get("dimension"), float(r["metric"]),
              None if r.get("secondary") is None else float(r["secondary"]), int(r["rank"])) for r in rows])


def _forecast(conn, key, rows):
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO forecast_series (series_key, module, period, dimension, yhat, yhat_lower, yhat_upper, is_forecast)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            [(key, MODULE, r["period"], r.get("dimension"), float(r["yhat"]),
              r.get("lower"), r.get("upper"), bool(r["is_forecast"])) for r in rows])


def _rec(conn, rec):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO recommendations (module, domain, title, observation, business_impact,"
            " recommended_action, priority, confidence, evidence) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (MODULE, rec["domain"], rec["title"], rec["observation"], rec["business_impact"],
             rec["recommended_action"], rec["priority"], rec.get("confidence"), json.dumps(rec.get("evidence", {}))))


def build_finance():
    rng = np.random.default_rng(RANDOM_SEED + 7)

    # revenue[year][segment], margin blended by region/channel mix
    revenue = {y: {s: _segment_revenue(rng, s, i) for s in SEGMENTS} for i, y in enumerate(YEARS)}
    seg_margin = {s: SEGMENTS[s]["margin"] for s in SEGMENTS}

    def total_rev(y):
        return sum(revenue[y].values())

    def blended_margin(y):
        return sum(revenue[y][s] * seg_margin[s] for s in SEGMENTS) / total_rev(y)

    latest, prior = YEARS[-1], YEARS[-2]
    rev_now, rev_prev = total_rev(latest), total_rev(prior)
    margin_now, margin_prev = blended_margin(latest), blended_margin(prior)
    profit_now = rev_now * (margin_now - OPEX_RATE)
    profit_prev = rev_prev * (margin_prev - OPEX_RATE)
    top_seg = max(revenue[latest], key=revenue[latest].get)

    with connect() as conn:
        _reset(conn)

        # --- KPIs ---------------------------------------------------------
        _kpi(conn, "revenue", "Revenue", rev_now, "Cr", rev_now - rev_prev, f"FY {latest}")
        _kpi(conn, "gross_margin", "Gross Margin", 100 * margin_now, "%",
             100 * (margin_now - margin_prev), f"FY {latest}")
        _kpi(conn, "operating_profit", "Operating Profit", profit_now, "Cr",
             profit_now - profit_prev, f"FY {latest}")
        _kpi(conn, "top_segment", "Top Segment", revenue[latest][top_seg], "Cr", None, top_seg)
        _kpi(conn, "revenue_per_segment", "Segments Tracked", len(SEGMENTS), "", None, f"FY {latest}")

        # --- series slots -------------------------------------------------
        # gross margin by year  (slot: placement_rate_by_cycle -> line chart)
        _series(conn, "placement_rate_by_cycle",
                [{"period": _year_end(y), "dimension": y, "value": 100 * blended_margin(y)} for y in YEARS])
        # revenue by segment across years (slot: median_ctc_by_sector_cycle -> momentum)
        seg_rows = []
        for y in YEARS:
            for s in SEGMENTS:
                seg_rows.append({"period": _year_end(y), "dimension": f"{s}|{y}", "value": revenue[y][s]})
        _series(conn, "median_ctc_by_sector_cycle", seg_rows)
        # margin by segment latest (slot: placement_rate_by_tier -> panel)
        _series(conn, "placement_rate_by_tier",
                [{"dimension": s, "value": 100 * seg_margin[s]} for s in SEGMENTS])

        # --- rankings -----------------------------------------------------
        # region by margin, worst first (slot: region_placement_rate)
        region_margin = sorted(
            [(r, 100 * margin_now * REGIONS[r]) for r in REGIONS], key=lambda x: x[1])
        _ranking(conn, "region_placement_rate",
                 [{"entity": r, "metric": m, "rank": i + 1} for i, (r, m) in enumerate(region_margin)])
        # channel by margin (slot: channel_effectiveness)
        chan = sorted([(c, 100 * (margin_now + adj)) for c, adj in CHANNELS.items()],
                      key=lambda x: -x[1])
        _ranking(conn, "channel_effectiveness",
                 [{"entity": c, "metric": m, "rank": i + 1} for i, (c, m) in enumerate(chan)])
        # top products by revenue (slot: most_demanded_skills) for the brief/ask
        prod = sorted(revenue[latest].items(), key=lambda x: -x[1])
        _ranking(conn, "most_demanded_skills",
                 [{"entity": s, "metric": v, "rank": i + 1} for i, (s, v) in enumerate(prod)])

        # --- forecasts ----------------------------------------------------
        # revenue trajectory (slot: median_ctc_cycle)
        rev_series = [total_rev(y) for y in YEARS]
        slope = (rev_series[-1] - rev_series[0]) / (len(rev_series) - 1)
        proj = rev_series[-1] + slope
        fc = [{"period": _year_end(y), "yhat": rev_series[i], "is_forecast": False}
              for i, y in enumerate(YEARS)]
        fc.append({"period": "2025-12-31", "yhat": proj, "lower": proj * 0.94,
                   "upper": proj * 1.06, "is_forecast": True})
        _forecast(conn, "median_ctc_cycle", fc)
        # monthly revenue (slot: placements_monthly)
        months = []
        for i, y in enumerate(YEARS):
            for m in range(1, 13):
                base = total_rev(y) / 12
                season = 1 + 0.12 * np.sin((m / 12) * 2 * np.pi)
                months.append({"period": f"{y}-{m:02d}-15", "yhat": base * season, "is_forecast": False})
        last_year_rev = total_rev(latest)
        for m in range(1, 13):
            base = (last_year_rev + slope) / 12
            season = 1 + 0.12 * np.sin((m / 12) * 2 * np.pi)
            v = base * season
            months.append({"period": f"2025-{m:02d}-15", "yhat": v, "lower": v * 0.9,
                           "upper": v * 1.1, "is_forecast": True})
        _forecast(conn, "placements_monthly", months)

        # --- recommendations ---------------------------------------------
        leg_change = 100 * (revenue[latest]["Legacy Licensing"] - revenue[YEARS[0]]["Legacy Licensing"]) / revenue[YEARS[0]]["Legacy Licensing"]
        leg_share = 100 * revenue[latest]["Legacy Licensing"] / rev_now
        weak_region, weak_margin = region_margin[0]
        worst_chan = chan[-1]
        cloud_change = 100 * (revenue[latest]["Cloud Platform"] - revenue[YEARS[0]]["Cloud Platform"]) / revenue[YEARS[0]]["Cloud Platform"]

        _rec(conn, {
            "domain": "Executive", "priority": "High", "confidence": 0.88,
            "title": "Wind down the Legacy Licensing line",
            "observation": (f"Legacy Licensing revenue fell {leg_change:.0f}% over three years yet still "
                            f"accounts for {leg_share:.0f}% of revenue at only {100*seg_margin['Legacy Licensing']:.0f}% gross margin, "
                            f"the lowest of any segment."),
            "business_impact": ("A large, shrinking, low-margin line ties up sales capacity and support cost "
                                "while dragging the blended margin down every quarter."),
            "recommended_action": ("Sunset Legacy Licensing on a 18 month plan, migrate accounts to Cloud "
                                   "Platform, and redeploy the freed sales capacity to higher-margin segments."),
            "evidence": {"revenue_change_pct": round(leg_change, 1), "revenue_share_pct": round(leg_share, 1),
                         "gross_margin_pct": round(100 * seg_margin["Legacy Licensing"], 1)}})

        _rec(conn, {
            "domain": "Finance", "priority": "High", "confidence": 0.83,
            "title": "Invest behind Cloud Platform",
            "observation": (f"Cloud Platform grew {cloud_change:.0f}% over three years at "
                            f"{100*seg_margin['Cloud Platform']:.0f}% gross margin, the highest-quality growth in the portfolio."),
            "business_impact": ("This is where incremental capital compounds fastest. Under-investing here "
                                "cedes the most profitable growth to competitors."),
            "recommended_action": ("Shift budget from Legacy Licensing into Cloud Platform sales and R&D, and "
                                   "set it as the primary growth bet for the next two fiscal years."),
            "evidence": {"revenue_change_pct": round(cloud_change, 1),
                         "gross_margin_pct": round(100 * seg_margin["Cloud Platform"], 1)}})

        _rec(conn, {
            "domain": "Operations", "priority": "Medium", "confidence": 0.8,
            "title": f"Fix margin in the {weak_region} region",
            "observation": (f"The {weak_region} region runs at {weak_margin:.1f}% gross margin versus "
                            f"{region_margin[-1][1]:.1f}% in the strongest region, the widest gap in the book."),
            "business_impact": (f"Every point of margin recovered in {weak_region} flows straight to operating "
                                f"profit given its revenue base."),
            "recommended_action": (f"Review pricing and discounting discipline in {weak_region}, and rebalance "
                                   f"its channel mix away from the lowest-margin channels."),
            "evidence": {"weak_region": weak_region, "margin": round(weak_margin, 1),
                         "best_margin": round(region_margin[-1][1], 1)}})

        _rec(conn, {
            "domain": "Marketing", "priority": "Medium", "confidence": 0.78,
            "title": f"Reprice or exit the {worst_chan[0]} channel",
            "observation": (f"The {worst_chan[0]} channel converts at {worst_chan[1]:.1f}% gross margin, well "
                            f"below the {chan[0][1]:.1f}% of the best channel."),
            "business_impact": ("Volume routed through the weakest channel earns little contribution and can be "
                                "margin negative after servicing cost."),
            "recommended_action": (f"Renegotiate {worst_chan[0]} economics or cap its volume, and steer demand "
                                   f"toward {chan[0][0]} and Online where margin is strongest."),
            "evidence": {"worst_channel": worst_chan[0], "worst_margin": round(worst_chan[1], 1),
                         "best_channel": chan[0][0], "best_margin": round(chan[0][1], 1)}})
