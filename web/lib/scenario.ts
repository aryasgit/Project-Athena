/**
 * The placement scenario engine.
 *
 * This is not decorative. It reuses the same causal structure the dataset was
 * generated from: a logit model for whether a student is placed, and
 * multiplicative factors for salary. Moving a lever shifts those terms and the
 * projected outcome is recomputed, so "change the assumptions and the
 * recommendation changes" is a real model response, not a canned number.
 *
 * All levers are held internally as fractions (0..1); the UI presents percents.
 */

export type Baseline = {
  placementRate: number; // percent, latest cycle
  medianCtc: number; // LPA
  cohort: number; // students in the cycle
  internCoverage: number; // percent with a prior internship
  channelShare: number; // percent sourced via high-yield channels
  weakRegion: string;
  weakRegionRate: number; // percent
};

export type Levers = {
  internCoverage: number; // %
  skillCoverage: number; // % trained in high-value skills (cloud / ML / system design)
  channelShare: number; // % via on-campus + referral
  regionIntervention: number; // 0..100 intensity on the weak region
  tierInvestment: number; // 0..100 intensity on Tier-2/Tier-3 training
};

export type Projection = {
  placementRate: number;
  medianCtc: number;
  placed: number;
  deltaRate: number; // percentage points
  deltaCtc: number; // LPA
  deltaCtcPct: number;
  deltaPlaced: number;
  confidence: number; // 0..1
  verdict: "Worth pursuing" | "Marginal gain" | "Not recommended";
  headline: string;
  drivers: { label: string; contribution: number }[];
};

// Structural shares of the cohort (from the warehouse composition).
const WEAK_REGION_SHARE = 0.2;
const TIER3_SHARE = 0.3;
const SKILL_BASELINE = 0.25; // assumed share already trained in high-value skills

const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function defaultLevers(b: Baseline): Levers {
  return {
    internCoverage: Math.round(b.internCoverage),
    skillCoverage: Math.round(SKILL_BASELINE * 100),
    channelShare: Math.round(b.channelShare),
    regionIntervention: 0,
    tierInvestment: 0,
  };
}

export function simulate(b: Baseline, lv: Levers): Projection {
  const base = {
    intern: b.internCoverage / 100,
    channel: b.channelShare / 100,
    skill: SKILL_BASELINE,
  };
  const now = {
    intern: lv.internCoverage / 100,
    channel: lv.channelShare / 100,
    skill: lv.skillCoverage / 100,
    region: lv.regionIntervention / 100,
    tier: lv.tierInvestment / 100,
  };

  // --- placement rate: shift the average logit by each lever's effect --------
  const dIntern = 0.2 * (now.intern - base.intern);
  const dChannel = 0.28 * (now.channel - base.channel);
  const dSkill = 0.1 * (now.skill - base.skill);
  const dRegion = 0.6 * now.region * WEAK_REGION_SHARE;
  const dTier = 0.5 * now.tier * TIER3_SHARE;

  const newLogit = logit(b.placementRate / 100) + dIntern + dChannel + dSkill + dRegion + dTier;
  const placementRate = clamp(sigmoid(newLogit) * 100, 0, 100);

  // --- median CTC: multiplicative salary factors -----------------------------
  const fSkill = 1 + 0.22 * (now.skill - base.skill);
  const fChannel = 1 + 0.14 * (now.channel - base.channel);
  const fIntern = 1 + 0.06 * (now.intern - base.intern);
  const medianCtc = b.medianCtc * fSkill * fChannel * fIntern;

  const placed = Math.round((placementRate / 100) * b.cohort);
  const basePlaced = Math.round((b.placementRate / 100) * b.cohort);

  const deltaRate = placementRate - b.placementRate;
  const deltaCtc = medianCtc - b.medianCtc;
  const deltaCtcPct = (deltaCtc / b.medianCtc) * 100;
  const deltaPlaced = placed - basePlaced;

  // --- confidence: further from the observed baseline, lower confidence ------
  const shift =
    Math.abs(now.intern - base.intern) +
    Math.abs(now.channel - base.channel) +
    Math.abs(now.skill - base.skill) +
    now.region +
    now.tier;
  const confidence = clamp(0.95 - 0.5 * shift, 0.55, 0.95);

  // --- verdict from a composite value score ----------------------------------
  const value = deltaRate * 0.6 + deltaCtcPct * 0.5;
  let verdict: Projection["verdict"];
  if (deltaRate < -0.2 || deltaCtc < -0.05) verdict = "Not recommended";
  else if (value >= 3) verdict = "Worth pursuing";
  else verdict = "Marginal gain";

  const drivers = [
    { label: "Internship coverage", contribution: dIntern },
    { label: "Skill training", contribution: dSkill + 0.22 * (now.skill - base.skill) },
    { label: "Channel mix", contribution: dChannel },
    { label: "Regional intervention", contribution: dRegion },
    { label: "Tier investment", contribution: dTier },
  ]
    .filter((d) => Math.abs(d.contribution) > 1e-6)
    .sort((a, b2) => b2.contribution - a.contribution);

  const top = drivers[0];
  const headline =
    verdict === "Not recommended"
      ? "This scenario reduces outcomes. Hold the current strategy."
      : top
        ? `${top.label} is the strongest lever here. ${verdict === "Worth pursuing" ? "The projected gain justifies the effort." : "The gain is real but modest."}`
        : "No levers moved from the current baseline.";

  return {
    placementRate, medianCtc, placed,
    deltaRate, deltaCtc, deltaCtcPct, deltaPlaced,
    confidence, verdict, headline, drivers,
  };
}
