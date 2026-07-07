"""Synthesize a realistic Placement Intelligence dataset.

The data is fabricated, but signal is deliberately embedded so the analytics
engine surfaces genuine, defensible patterns:

  * university tier drives both placement rate and salary
  * a set of skills carry real salary premiums (cloud, ML, system design)
  * hiring channels differ in effectiveness (on-campus places, referrals pay)
  * CGPA and prior internships lift placement odds
  * salaries trend up across cycles, but one sector ("IT Services") is in decline
  * one region ("East") structurally underperforms

Outputs one CSV per warehouse table into ``data/raw``.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .config import RAW_DIR, RANDOM_SEED

CYCLES = ["2022-23", "2023-24", "2024-25"]
# Placement season months (Aug of first year through Apr of next).
CYCLE_MONTHS = [(8, 0), (9, 0), (10, 0), (11, 0), (12, 0), (1, 1), (2, 1), (3, 1), (4, 1)]

REGIONS = ["North", "South", "West", "East", "Central"]
# East is the structurally weak region.
REGION_STRENGTH = {"North": 1.0, "South": 1.06, "West": 1.04, "East": 0.80, "Central": 0.97}

TIERS = ["Tier-1", "Tier-2", "Tier-3"]
TIER_WEIGHTS = [0.25, 0.45, 0.30]
TIER_PLACEMENT = {"Tier-1": 0.34, "Tier-2": 0.12, "Tier-3": -0.06}   # logit offset
TIER_SALARY = {"Tier-1": 1.45, "Tier-2": 1.0, "Tier-3": 0.78}       # salary multiplier

SECTORS = {
    "Software Product": {"base": 14.0, "trend": 0.09, "weight": 0.24},
    "Finance": {"base": 15.5, "trend": 0.07, "weight": 0.12},
    "Consulting": {"base": 12.5, "trend": 0.05, "weight": 0.12},
    "IT Services": {"base": 6.5, "trend": -0.06, "weight": 0.28},   # declining
    "E-Commerce": {"base": 13.0, "trend": 0.08, "weight": 0.10},
    "Core Engineering": {"base": 7.5, "trend": 0.01, "weight": 0.14},
}
COMPANY_TIERS = ["Global MNC", "Product", "Service", "Startup"]

ROLES = [
    ("Software Engineer", "Engineering", "Entry"),
    ("Backend Engineer", "Engineering", "Entry"),
    ("Frontend Engineer", "Engineering", "Entry"),
    ("Data Analyst", "Data", "Entry"),
    ("Data Scientist", "Data", "Associate"),
    ("ML Engineer", "Data", "Associate"),
    ("Business Analyst", "Analyst", "Entry"),
    ("Product Analyst", "Analyst", "Entry"),
    ("Consultant", "Consulting", "Entry"),
    ("Financial Analyst", "Finance", "Entry"),
    ("Systems Engineer", "Engineering", "Entry"),
    ("Cloud Engineer", "Engineering", "Associate"),
    ("QA Engineer", "Engineering", "Entry"),
    ("Operations Associate", "Operations", "Entry"),
    ("Design Engineer", "Core", "Entry"),
]
ROLE_SALARY = {  # role-level multiplier on top of sector base
    "ML Engineer": 1.35, "Data Scientist": 1.30, "Cloud Engineer": 1.28,
    "Backend Engineer": 1.15, "Software Engineer": 1.12, "Consultant": 1.10,
    "Financial Analyst": 1.08, "Product Analyst": 1.05, "Frontend Engineer": 1.05,
    "Data Analyst": 1.0, "Business Analyst": 0.98, "Systems Engineer": 0.92,
    "Design Engineer": 0.9, "QA Engineer": 0.88, "Operations Associate": 0.85,
}

CHANNELS = [
    ("On-Campus", "Institutional", 0.30, 0.98),      # (name, type, placement offset, salary mult)
    ("Referral", "Networked", 0.18, 1.16),
    ("Job Portal", "Open Market", -0.10, 0.94),
    ("Recruitment Agency", "Open Market", 0.02, 1.02),
    ("Direct Application", "Networked", -0.02, 1.0),
]

SKILLS = [
    ("Python", "Programming", 1.10), ("Java", "Programming", 1.04),
    ("JavaScript", "Programming", 1.03), ("C++", "Programming", 1.02),
    ("SQL", "Data", 1.06), ("Machine Learning", "Data", 1.22),
    ("Deep Learning", "Data", 1.20), ("Data Visualization", "Data", 1.05),
    ("AWS", "Cloud", 1.18), ("Azure", "Cloud", 1.14), ("Docker", "Cloud", 1.12),
    ("Kubernetes", "Cloud", 1.16), ("System Design", "Engineering", 1.24),
    ("React", "Programming", 1.08), ("Node.js", "Programming", 1.06),
    ("Excel", "Analytics", 0.97), ("Power BI", "Analytics", 1.04),
    ("Tableau", "Analytics", 1.05), ("Communication", "Soft", 1.02),
    ("Problem Solving", "Soft", 1.03), ("Statistics", "Data", 1.07),
    ("NLP", "Data", 1.19), ("Spark", "Data", 1.15), ("Go", "Programming", 1.13),
    ("Financial Modeling", "Finance", 1.11),
]
_SKILL_MULT = {name: mult for name, _cat, mult in SKILLS}

# Skills whose demand grows across cycles (share of students listing them rises).
RISING_SKILLS = {"Machine Learning", "AWS", "System Design", "Kubernetes", "NLP", "Spark"}

DEGREES = [
    ("B.Tech", ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil"]),
    ("M.Tech", ["Computer Science", "Data Science", "VLSI"]),
    ("MBA", ["Finance", "Marketing", "Operations"]),
    ("MCA", ["Computer Applications"]),
]
CGPA_BANDS = ["<7", "7-8", "8-9", "9+"]
CGPA_WEIGHTS = [0.18, 0.37, 0.31, 0.14]
CGPA_PLACEMENT = {"<7": -0.35, "7-8": -0.05, "8-9": 0.22, "9+": 0.45}
CGPA_SALARY = {"<7": 0.9, "7-8": 0.98, "8-9": 1.06, "9+": 1.16}

N_STUDENTS_PER_CYCLE = 2600
N_UNIVERSITIES = 30
N_COMPANIES = 80


def _sigmoid(x: np.ndarray | float) -> np.ndarray | float:
    return 1.0 / (1.0 + np.exp(-x))


def _build_dim_date() -> pd.DataFrame:
    rows = []
    for cycle in CYCLES:
        start_year = int(cycle.split("-")[0])
        for month, year_off in CYCLE_MONTHS:
            year = start_year + year_off
            full = pd.Timestamp(year=year, month=month, day=15)
            rows.append({
                "date_key": int(full.strftime("%Y%m%d")),
                "full_date": full.date(),
                "year": year,
                "quarter": (month - 1) // 3 + 1,
                "month": month,
                "month_name": full.strftime("%B"),
                "placement_cycle": cycle,
            })
    return pd.DataFrame(rows)


def _build_dim_university(rng: np.random.Generator) -> pd.DataFrame:
    rows = []
    for i in range(1, N_UNIVERSITIES + 1):
        tier = rng.choice(TIERS, p=TIER_WEIGHTS)
        region = rng.choice(REGIONS)
        rows.append({
            "university_code": f"UNI{i:03d}",
            "name": f"{region} Institute of Technology {i}",
            "tier": tier,
            "region": region,
            "established_year": int(rng.integers(1955, 2010)),
        })
    return pd.DataFrame(rows)


def _build_dim_company(rng: np.random.Generator) -> pd.DataFrame:
    sector_names = list(SECTORS)
    sector_probs = np.array([SECTORS[s]["weight"] for s in sector_names])
    sector_probs = sector_probs / sector_probs.sum()
    rows = []
    for i in range(1, N_COMPANIES + 1):
        sector = rng.choice(sector_names, p=sector_probs)
        tier = rng.choice(COMPANY_TIERS, p=[0.28, 0.30, 0.27, 0.15])
        rows.append({
            "company_code": f"CMP{i:03d}",
            "name": f"{sector.split()[0]} {tier.split()[0]} {i}",
            "sector": sector,
            "company_tier": tier,
        })
    return pd.DataFrame(rows)


def _build_static_dims() -> dict[str, pd.DataFrame]:
    dim_role = pd.DataFrame(
        [{"title": t, "job_family": f, "seniority": s} for t, f, s in ROLES]
    )
    dim_channel = pd.DataFrame(
        [{"channel_name": n, "channel_type": t} for n, t, _, _ in CHANNELS]
    )
    dim_skill = pd.DataFrame(
        [{"skill_name": n, "skill_category": c} for n, c, _ in SKILLS]
    )
    return {"dim_role": dim_role, "dim_channel": dim_channel, "dim_skill": dim_skill}


def _pick_skills(rng: np.random.Generator, role: str, cycle_idx: int) -> list[str]:
    """Choose 3-6 skills, biased by role and rising-skill demand over cycles."""
    names = np.array([s[0] for s in SKILLS])
    weights = np.ones(len(SKILLS))
    for j, (name, cat, _) in enumerate(SKILLS):
        if name in RISING_SKILLS:
            weights[j] += 0.6 * cycle_idx            # demand grows each cycle
        if "Data" in role or "ML" in role:
            if cat in ("Data",):
                weights[j] += 1.2
        if "Engineer" in role and cat in ("Programming", "Cloud", "Engineering"):
            weights[j] += 0.9
        if role in ("Consultant", "Business Analyst", "Financial Analyst") and cat in ("Analytics", "Finance", "Soft"):
            weights[j] += 1.0
    weights = weights / weights.sum()
    k = int(rng.integers(3, 7))
    idx = rng.choice(len(SKILLS), size=k, replace=False, p=weights)
    return list(names[idx])


def generate() -> dict[str, pd.DataFrame]:
    """Generate all tables and write them to ``data/raw``."""
    rng = np.random.default_rng(RANDOM_SEED)

    dim_date = _build_dim_date()
    dim_university = _build_dim_university(rng)
    dim_company = _build_dim_company(rng)
    static = _build_static_dims()

    # Fast lookups by code -> attributes.
    uni_records = dim_university.to_dict("records")
    company_records = dim_company.to_dict("records")
    date_by_cycle = {c: dim_date[dim_date.placement_cycle == c] for c in CYCLES}

    students: list[dict] = []
    facts: list[dict] = []
    bridge: list[tuple[str, str]] = []

    student_counter = 0
    for cycle_idx, cycle in enumerate(CYCLES):
        cycle_dates = date_by_cycle[cycle]["date_key"].to_numpy()
        for _ in range(N_STUDENTS_PER_CYCLE):
            student_counter += 1
            code = f"STU{student_counter:06d}"

            uni = uni_records[int(rng.integers(0, len(uni_records)))]
            degree, majors = DEGREES[int(rng.integers(0, len(DEGREES)))]
            major = rng.choice(majors)
            cgpa = rng.choice(CGPA_BANDS, p=CGPA_WEIGHTS)
            internship = bool(rng.random() < 0.42)
            gender = rng.choice(["Male", "Female"], p=[0.63, 0.37])

            ch_idx = int(rng.integers(0, len(CHANNELS)))
            ch_name, ch_type, ch_place_off, ch_sal_mult = CHANNELS[ch_idx]

            # Placement probability (logit model).
            logit = (
                0.15
                + TIER_PLACEMENT[uni["tier"]]
                + CGPA_PLACEMENT[cgpa]
                + (0.20 if internship else 0.0)
                + ch_place_off
                + np.log(REGION_STRENGTH[uni["region"]])
                + 0.06 * cycle_idx                        # market improving overall
                + rng.normal(0, 0.18)
            )
            placed = rng.random() < _sigmoid(logit)

            students.append({
                "student_code": code, "gender": gender, "degree": degree,
                "major": major, "cgpa_band": cgpa, "prior_internship": internship,
            })

            date_key = int(rng.choice(cycle_dates))

            if not placed:
                facts.append({
                    "student_code": code, "university_code": uni["university_code"],
                    "company_code": None, "role_title": None, "channel_name": ch_name,
                    "date_key": date_key, "is_placed": 0, "ctc_lpa": None,
                    "interview_rounds": int(rng.integers(0, 3)),
                    "offers_received": 0, "days_to_offer": None,
                })
                continue

            # Placed: pick a company + role, then compute CTC.
            company = company_records[int(rng.integers(0, len(company_records)))]
            sector = company["sector"]
            role_title = str(rng.choice([r[0] for r in ROLES]))
            skills = _pick_skills(rng, role_title, cycle_idx)

            sector_cfg = SECTORS[sector]
            base = sector_cfg["base"] * (1 + sector_cfg["trend"] * cycle_idx)
            # The strongest skill drives most of the premium; the rest add a
            # smaller supporting lift. Multiplier spread is amplified so skill
            # value stays legible above the (larger) sector base differences.
            skill_mults = [1 + (_SKILL_MULT[sk] - 1) * 2.2 for sk in skills]
            best = max(skill_mults)
            others = [m for m in skill_mults if m is not best]
            rest_lift = float(np.mean([m - 1 for m in others])) if others else 0.0
            skill_prem = best * (1 + 0.3 * rest_lift)
            ctc = (
                base
                * TIER_SALARY[uni["tier"]]
                * ROLE_SALARY[role_title]
                * CGPA_SALARY[cgpa]
                * ch_sal_mult
                * skill_prem
                * (1.06 if internship else 1.0)
                * rng.lognormal(0, 0.12)
            )
            ctc = round(float(np.clip(ctc, 3.0, 65.0)), 2)
            offers = int(1 + rng.poisson(0.6 if uni["tier"] == "Tier-1" else 0.25))

            facts.append({
                "student_code": code, "university_code": uni["university_code"],
                "company_code": company["company_code"], "role_title": role_title,
                "channel_name": ch_name, "date_key": date_key, "is_placed": 1,
                "ctc_lpa": ctc, "interview_rounds": int(rng.integers(1, 6)),
                "offers_received": offers,
                "days_to_offer": int(rng.integers(7, 95)),
            })
            for sk in skills:
                bridge.append((code, sk))

    dim_student = pd.DataFrame(students)
    fact = pd.DataFrame(facts)
    bridge_df = pd.DataFrame(bridge, columns=["student_code", "skill_name"])

    tables = {
        "dim_date": dim_date,
        "dim_university": dim_university,
        "dim_company": dim_company,
        "dim_student": dim_student,
        "fact_placement": fact,
        "bridge_placement_skill": bridge_df,
        **static,
    }

    for name, df in tables.items():
        df.to_csv(RAW_DIR / f"{name}.csv", index=False)

    return tables
