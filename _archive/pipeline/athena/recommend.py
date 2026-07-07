"""Recommendation engine.

Reads the warehouse and the computed analytics, runs a couple of statistical
checks, and emits structured recommendations in the consulting triad:
Observation -> Business Impact -> Recommended Action. Each carries a priority,
a confidence score, and machine-readable evidence.
"""

from __future__ import annotations

import json

import numpy as np
from scipy import stats

from .config import MODULE
from .db import connect
from .warehouse import load_facts, load_skills, ordered_cycles


def _reset(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("TRUNCATE recommendations RESTART IDENTITY")


def _write(conn, rec: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO recommendations
               (module, domain, title, observation, business_impact,
                recommended_action, priority, confidence, evidence)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (MODULE, rec["domain"], rec["title"], rec["observation"],
             rec["business_impact"], rec["recommended_action"], rec["priority"],
             rec.get("confidence"), json.dumps(rec.get("evidence", {}))),
        )


def _pct(x: float) -> str:
    return f"{x:+.1f}%"


def build_recommendations(facts, skills, cycles) -> list[dict]:
    recs: list[dict] = []
    latest, first = cycles[-1], cycles[0]
    cur = facts[facts.placement_cycle == latest]
    placed_cur = cur[cur.is_placed == 1]

    # 1. Declining IT Services sector (Executive) -----------------------------
    it_first = facts[(facts.placement_cycle == first) & (facts.sector == "IT Services") & (facts.is_placed == 1)]["ctc_lpa"].median()
    it_last = placed_cur[placed_cur.sector == "IT Services"]["ctc_lpa"].median()
    it_change = 100.0 * (it_last - it_first) / it_first
    it_share = 100.0 * (placed_cur.sector == "IT Services").mean()
    recs.append({
        "domain": "Executive", "priority": "High", "confidence": 0.86,
        "title": "Reduce structural reliance on IT Services placements",
        "observation": (
            f"Median CTC in IT Services fell {_pct(it_change)} from {first} to {latest} "
            f"(₹{it_first:.1f}→₹{it_last:.1f} LPA), yet the sector still absorbs "
            f"{it_share:.0f}% of all placements, the largest single share."),
        "business_impact": (
            "The institution's headline salary metrics are being dragged down by a "
            "high-volume, low-growth sector. Continued dependence caps median-CTC "
            "improvement regardless of gains elsewhere."),
        "recommended_action": (
            "Rebalance the recruiter mix toward Software Product, Finance and E-Commerce "
            "employers; set a target to bring IT Services below 20% of placements within "
            "two cycles and prioritise higher-CTC recruiters for on-campus slots."),
        "evidence": {"it_services_ctc_change_pct": round(it_change, 1),
                     "it_services_share_pct": round(it_share, 1),
                     "ctc_first": round(float(it_first), 1), "ctc_last": round(float(it_last), 1)},
    })

    # 2. Underperforming region (Executive / Strategy) ------------------------
    region_rate = (cur.groupby("region")["is_placed"].mean() * 100).sort_values()
    weak_region, weak_rate = region_rate.index[0], region_rate.iloc[0]
    avg_rate = float((cur["is_placed"].mean()) * 100)
    gap = avg_rate - weak_rate
    recs.append({
        "domain": "Executive", "priority": "High" if gap > 8 else "Medium",
        "confidence": 0.82,
        "title": f"Targeted intervention for the {weak_region} region",
        "observation": (
            f"The {weak_region} region places {weak_rate:.1f}% of students versus a "
            f"{avg_rate:.1f}% institution average, a {gap:.1f} point gap, the widest "
            f"of any region."),
        "business_impact": (
            f"Roughly {gap:.0f} in every 100 eligible students in {weak_region} miss "
            f"placement relative to peer regions, concentrating unplaced risk and weakening "
            f"regional employer relationships."),
        "recommended_action": (
            f"Run a focused employer-outreach and mock-interview program in {weak_region}; "
            f"assign a dedicated placement coordinator and review results next cycle before "
            f"further investment."),
        "evidence": {"weak_region": weak_region, "region_rate": round(float(weak_rate), 1),
                     "avg_rate": round(avg_rate, 1), "gap_points": round(float(gap), 1)},
    })

    # 3. Hiring-channel effectiveness (HR) ------------------------------------
    chan = cur.groupby("channel_name").agg(rate=("is_placed", lambda s: 100 * s.mean()))
    chan_ctc = placed_cur.groupby("channel_name")["ctc_lpa"].median()
    best_ch = chan["rate"].idxmax()
    worst_ch = chan["rate"].idxmin()
    best_pay_ch = chan_ctc.idxmax()
    recs.append({
        "domain": "HR", "priority": "Medium", "confidence": 0.8,
        "title": "Shift sourcing toward the highest-yield hiring channels",
        "observation": (
            f"'{best_ch}' converts {chan.loc[best_ch,'rate']:.1f}% of candidates versus "
            f"{chan.loc[worst_ch,'rate']:.1f}% for '{worst_ch}', while '{best_pay_ch}' "
            f"produces the highest median CTC (₹{chan_ctc[best_pay_ch]:.1f} LPA)."),
        "business_impact": (
            "Channel choice materially changes both placement probability and pay. "
            "Effort spread evenly across channels wastes coordinator time on the "
            "lowest-converting sources."),
        "recommended_action": (
            f"Concentrate coordinator effort on '{best_ch}' for volume and build the "
            f"'{best_pay_ch}' channel for salary outcomes; de-prioritise '{worst_ch}' "
            f"unless conversion improves."),
        "evidence": {"best_channel": best_ch, "best_channel_rate": round(float(chan.loc[best_ch, "rate"]), 1),
                     "worst_channel": worst_ch, "worst_channel_rate": round(float(chan.loc[worst_ch, "rate"]), 1),
                     "highest_pay_channel": best_pay_ch},
    })

    # 4. Rising critical skills (HR / Curriculum) -----------------------------
    sk_last = skills[(skills.placement_cycle == latest) & (skills.is_placed == 1)]
    sk_first = skills[(skills.placement_cycle == first) & (skills.is_placed == 1)]
    n_last = placed_cur.shape[0]
    overall_med = placed_cur["ctc_lpa"].median()
    growth = {}
    for sk in ["Machine Learning", "AWS", "System Design", "Kubernetes"]:
        share_last = 100.0 * (sk_last.skill_name == sk).sum() / max(n_last, 1)
        share_first = 100.0 * (sk_first.skill_name == sk).sum() / max(sk_first.placement_key.nunique(), 1)
        med_sk = sk_last[sk_last.skill_name == sk]["ctc_lpa"].median()
        prem = 100.0 * (med_sk - overall_med) / overall_med
        growth[sk] = {"share_last": round(share_last, 1),
                      "share_change": round(share_last - share_first, 1),
                      "premium_pct": round(float(prem), 1)}
    top_skill = max(growth, key=lambda k: growth[k]["premium_pct"])
    recs.append({
        "domain": "HR", "priority": "High", "confidence": 0.84,
        "title": "Prioritise cloud, ML and system-design upskilling",
        "observation": (
            f"Skills such as {top_skill} now command a "
            f"{growth[top_skill]['premium_pct']:+.0f}% CTC premium over the median and "
            f"appear in a rising share of offers ({growth[top_skill]['share_change']:+.1f} "
            f"points since {first})."),
        "business_impact": (
            "Demand and pay are concentrating in a small set of high-value skills. "
            "Cohorts without them are increasingly funnelled into lower-CTC roles."),
        "recommended_action": (
            f"Embed {', '.join(list(growth)[:3])} into pre-placement training and make at "
            f"least one cloud/ML certification a graduation-readiness target."),
        "evidence": {"skills": growth, "overall_median_ctc": round(float(overall_med), 1)},
    })

    # 5. Internship effect on placement (Operations), hypothesis test ---------
    with_i = cur[cur.prior_internship == True]["is_placed"]
    without_i = cur[cur.prior_internship == False]["is_placed"]
    rate_with = 100.0 * with_i.mean()
    rate_without = 100.0 * without_i.mean()
    tstat, pval = stats.ttest_ind(with_i, without_i, equal_var=False)
    recs.append({
        "domain": "Operations", "priority": "High" if pval < 0.01 else "Medium",
        "confidence": float(np.clip(1 - pval, 0.6, 0.99)),
        "title": "Scale the pre-placement internship pipeline",
        "observation": (
            f"Students with a prior internship place at {rate_with:.1f}% versus "
            f"{rate_without:.1f}% without one, a {rate_with - rate_without:.1f} point "
            f"difference (Welch t-test p={pval:.3g})."),
        "business_impact": (
            "Internship exposure is one of the strongest controllable predictors of "
            "placement. Expanding it lifts the whole cohort's outcomes, not just top "
            "performers."),
        "recommended_action": (
            "Set an internship-conversion target of 60%+ of the cohort and formalise "
            "employer internship partnerships in the two cycles before final placement."),
        "evidence": {"rate_with_internship": round(float(rate_with), 1),
                     "rate_without_internship": round(float(rate_without), 1),
                     "p_value": float(pval), "t_stat": float(tstat)},
    })

    # 6. Tier-3 investment decision (Finance / Strategy) ----------------------
    tier = cur.groupby("university_tier").agg(rate=("is_placed", lambda s: 100 * s.mean()))
    tier_ctc = placed_cur.groupby("university_tier")["ctc_lpa"].median()
    t3_rate = float(tier.loc["Tier-3", "rate"]) if "Tier-3" in tier.index else 0.0
    t1_rate = float(tier.loc["Tier-1", "rate"]) if "Tier-1" in tier.index else 0.0
    recs.append({
        "domain": "Finance", "priority": "Medium", "confidence": 0.78,
        "title": "Reallocate placement investment across university tiers",
        "observation": (
            f"Tier-1 institutes place {t1_rate:.1f}% of students at ₹{tier_ctc.get('Tier-1', float('nan')):.1f} "
            f"LPA median, while Tier-3 places {t3_rate:.1f}% at "
            f"₹{tier_ctc.get('Tier-3', float('nan')):.1f} LPA."),
        "business_impact": (
            "Marginal placement spend yields very different returns by tier. Uniform "
            "budgeting under-serves where uplift is achievable and over-serves saturated "
            "segments."),
        "recommended_action": (
            "Direct incremental training budget to Tier-2/Tier-3 cohorts where the "
            "conversion gap is largest, and hold Tier-1 spend flat while protecting its "
            "premium recruiter relationships."),
        "evidence": {"tier1_rate": round(t1_rate, 1), "tier3_rate": round(t3_rate, 1),
                     "tier1_median_ctc": round(float(tier_ctc.get("Tier-1", float("nan"))), 1),
                     "tier3_median_ctc": round(float(tier_ctc.get("Tier-3", float("nan"))), 1)},
    })

    return recs


def run_recommendations() -> None:
    with connect() as conn:
        facts = load_facts(conn)
        skills = load_skills(conn)
        cycles = ordered_cycles(facts)
        _reset(conn)
        for rec in build_recommendations(facts, skills, cycles):
            _write(conn, rec)
