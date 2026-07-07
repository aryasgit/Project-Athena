"""Natural-language decision interface (Layer 5).

The order is the law: retrieve structured analytical results FIRST, then let the
AI reason over them. The question never reaches a model without evidence, and
answers cite the figures they rest on. With no AI provider, a deterministic
answer is composed from the same retrieved evidence.
"""

from __future__ import annotations

from athena.config import MODULE

from . import ai
from .data import forecast, kpis, ranking, recommendations


def _kpi(k, key):
    return next((r for r in k if r["metric_key"] == key), None)


def retrieve(conn, question: str, module=MODULE) -> dict:
    """Pull the evidence relevant to the question. Always includes headline KPIs."""
    q = question.lower()
    k = kpis(conn, module)
    rate, ctc = _kpi(k, "placement_rate"), _kpi(k, "median_ctc")
    evidence: dict = {"headline": {
        "placement_rate": rate and rate["value"], "placement_rate_delta": rate and rate["delta"],
        "median_ctc": ctc and ctc["value"], "median_ctc_delta": ctc and ctc["delta"],
    }}
    citations: list[str] = []

    def cite(text):
        citations.append(text)

    if rate:
        cite(f"Placement rate {rate['value']:.1f}% ({rate['delta']:+.1f} pts vs prior cycle).")
    if ctc:
        cite(f"Median CTC ₹{ctc['value']:.1f} LPA ({ctc['delta']:+.1f} LPA vs prior cycle).")

    if any(w in q for w in ("region", "underperform", "where", "geograph")):
        region = ranking(conn, "region_placement_rate", module)
        if region:
            evidence["regions"] = region
            worst = region[0]
            cite(f"{worst['entity']} is the weakest region at {worst['metric']:.1f}% placement.")

    if any(w in q for w in ("skill", "pay", "premium", "critical", "demand")):
        prem = ranking(conn, "skill_salary_premium", module)
        if prem:
            evidence["skill_premium"] = prem[:5]
            cite(f"Top skill premium: {prem[0]['entity']} at {prem[0]['metric']:+.1f}% over median.")

    if any(w in q for w in ("channel", "source", "hire", "recruit")):
        ch = ranking(conn, "channel_effectiveness", module)
        if ch:
            evidence["channels"] = ch
            cite(f"{ch[0]['entity']} is the highest-yield channel at {ch[0]['metric']:.1f}%.")

    if any(w in q for w in ("ctc", "salary", "pay", "forecast", "next", "future", "project")):
        fc = forecast(conn, "median_ctc_cycle", module)
        proj = next((p for p in fc if p["is_forecast"]), None)
        if proj:
            evidence["ctc_forecast_next"] = proj["yhat"]
            cite(f"Median CTC projected to ₹{proj['yhat']:.1f} LPA next cycle.")

    if any(w in q for w in ("sector", "revenue", "decline", "fall", "fell", "drop", "it services")):
        recs = recommendations(conn, module)
        it = next((r for r in recs if "IT Services" in r["title"] or "IT Services" in r["observation"]), None)
        if it:
            evidence["declining_sector"] = {"title": it["title"], "observation": it["observation"]}
            cite(it["observation"])

    if any(w in q for w in ("invest", "budget", "allocate", "should we", "priorit")):
        recs = recommendations(conn, module)
        evidence["recommendations"] = [
            {"title": r["title"], "action": r["recommended_action"], "priority": r["priority"]}
            for r in recs[:4]
        ]

    return {"evidence": evidence, "citations": citations}


def answer(conn, question: str, persona: str = "executive", module=MODULE) -> dict:
    retrieved = retrieve(conn, question, module)
    evidence, citations = retrieved["evidence"], retrieved["citations"]

    ai_text = None
    if ai.is_configured():
        import json
        prompt = (
            f'Question: "{question}"\n\n'
            "Answer the question using ONLY the evidence below. Cite the figures you use. "
            "If the evidence does not answer it, say so plainly.\n\nEVIDENCE:\n"
            + json.dumps(evidence, indent=2, default=str)
        )
        ai_text = ai.generate(ai.PERSONAS.get(persona, ai.PERSONAS["executive"]), prompt)

    if ai_text:
        return {
            "question": question, "answer": ai_text, "citations": citations,
            "evidence": evidence,
            "provenance": {"engine": "ai-enhanced", "provider": ai.provider_label(), "persona": persona},
        }

    # Deterministic answer: stitch the retrieved citations into prose.
    body = " ".join(citations) if citations else "No structured evidence matched this question."
    return {
        "question": question,
        "answer": f"Based on the {module} analytics: {body}",
        "citations": citations, "evidence": evidence,
        "provenance": {"engine": "deterministic", "provider": ai.provider_label(), "persona": persona},
    }
