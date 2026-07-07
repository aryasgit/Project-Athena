"""Executive Brief builder (Python, for the API and n8n).

Deterministic first: a full board-ready brief is assembled from the result
tables and works with every AI provider off. If a provider is configured, the AI
layer rewrites only the narrative prose. Numbers and recommendations always come
from the deterministic layer.
"""

from __future__ import annotations

import json
import re

from athena.config import MODULE

from . import ai
from .data import forecast, kpis, ranking, recommendations


def _by_key(rows, key):
    return next((r for r in rows if r["metric_key"] == key), None)


def _fmt_delta(d, unit=""):
    if d is None:
        return ""
    return f"{'up' if d >= 0 else 'down'} {abs(d):.1f}{unit}"


def _first_sentence(text: str) -> str:
    m = re.match(r"^[^.]+\.", text)
    return (m.group(0) if m else text).strip()


def build_brief(conn, module=MODULE) -> dict:
    k = kpis(conn, module)
    recs = recommendations(conn, module)
    skill_prem = ranking(conn, "skill_salary_premium", module)
    region = ranking(conn, "region_placement_rate", module)
    channel = ranking(conn, "channel_effectiveness", module)
    ctc_fc = forecast(conn, "median_ctc_cycle", module)

    rate = _by_key(k, "placement_rate")
    ctc = _by_key(k, "median_ctc")
    placed = _by_key(k, "total_placements")
    top_sector = _by_key(k, "top_sector_hiring")
    cycle = (rate["context"].replace("Cycle ", "") if rate and rate["context"] else "latest")
    projected = next((p for p in ctc_fc if p["is_forecast"]), None)
    top_skill = skill_prem[0] if skill_prem else None
    best_channel = channel[0] if channel else None
    weak_region = region[0] if region else None

    summary = (
        f"In the {cycle} cycle, "
        f"{round(placed['value']):,} students were placed at a "
        f"{rate['value']:.1f}% placement rate ({_fmt_delta(rate['delta'], ' points')} on the prior cycle), "
        f"with a median CTC of ₹{ctc['value']:.1f} LPA ({_fmt_delta(ctc['delta'], ' LPA')}). "
        + (f"{top_sector['context']} is the largest recruiting sector. " if top_sector else "")
        + (f"The salary trajectory projects to ₹{projected['yhat']:.1f} LPA next cycle." if projected else "")
    )

    insights = [x for x in [
        top_skill and f"{top_skill['entity']} carries the clearest salary premium at "
                      f"{'+' if top_skill['metric'] >= 0 else ''}{top_skill['metric']:.1f}% over the median.",
        best_channel and f"{best_channel['entity']} is the highest-yield hiring channel at "
                         f"{best_channel['metric']:.1f}%.",
        weak_region and f"{weak_region['entity']} is the weakest region at {weak_region['metric']:.1f}%, "
                        f"below the {rate['value']:.1f}% average.",
    ] if x]

    high = [r for r in recs if r["priority"] == "High"]
    risks = ([r["observation"] for r in high]
             + ([f"Placement is concentrated away from {weak_region['entity']}, "
                 f"leaving that region exposed."] if weak_region else []))[:4]

    recommendations_out = [{
        "title": r["title"], "action": r["recommended_action"],
        "priority": r["priority"], "domain": r["domain"],
    } for r in recs[:5]]

    next_actions = [_first_sentence(r["recommended_action"]) for r in high][:4]

    evidence = {
        "cycle": cycle,
        "placement_rate": rate and rate["value"], "placement_rate_delta": rate and rate["delta"],
        "median_ctc": ctc and ctc["value"], "median_ctc_delta": ctc and ctc["delta"],
        "students_placed": placed and placed["value"],
        "top_sector": top_sector and top_sector["context"],
        "projected_next_ctc": projected and projected["yhat"],
        "top_skill_premium": top_skill and {"skill": top_skill["entity"], "premium_pct": top_skill["metric"]},
        "best_channel": best_channel and {"channel": best_channel["entity"], "rate": best_channel["metric"]},
        "weak_region": weak_region and {"region": weak_region["entity"], "rate": weak_region["metric"]},
        "recommendations": [{"title": r["title"], "priority": r["priority"], "domain": r["domain"]} for r in recs],
    }

    brief = {
        "provenance": {"engine": "deterministic", "provider": ai.provider_label()},
        "cycle": cycle, "summary": summary, "insights": insights, "risks": risks,
        "recommendations": recommendations_out, "next_actions": next_actions, "evidence": evidence,
    }

    if ai.is_configured():
        enhanced = _enhance(evidence)
        if enhanced:
            brief["summary"] = enhanced.get("summary") or brief["summary"]
            if enhanced.get("insights"):
                brief["insights"] = enhanced["insights"]
            if enhanced.get("risks"):
                brief["risks"] = enhanced["risks"]
            if enhanced.get("next_actions"):
                brief["next_actions"] = enhanced["next_actions"]
            brief["provenance"]["engine"] = "ai-enhanced"

    return brief


def _enhance(evidence: dict):
    prompt = (
        "Here is the structured analytical output for a placement-intelligence cycle. "
        "Write an executive brief strictly from this evidence. Respond with ONLY valid JSON of the shape "
        '{"summary": string, "insights": string[], "risks": string[], "next_actions": string[]}. '
        "Keep summary to 3 sentences, 3 to 5 items per list.\n\nEVIDENCE:\n"
        + json.dumps(evidence, indent=2, default=str)
    )
    raw = ai.generate(ai.PERSONAS["report_writer"], prompt, temperature=0.2)
    if not raw:
        return None
    try:
        cleaned = re.sub(r"^```json\s*", "", raw).rstrip("`").strip()
        return json.loads(cleaned)
    except Exception:  # noqa: BLE001
        return None
