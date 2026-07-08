/**
 * The Ruleset — every governing coefficient of the simulation, in one place.
 *
 * This is what turns Athena from a fixed toy into a research instrument: the
 * numbers that drive the model are DATA, not magic constants buried in the
 * engine. A run is fully defined by (seed + ruleset), so an experiment is
 * reproducible and every assumption is explicit and inspectable. Presets are
 * just named starting points on top of these defaults; advanced users can
 * override any field, save it as a scenario, and share it.
 *
 * Defaults reproduce the hand-tuned behaviour the engine shipped with.
 */

import type { GrowthStrategy } from "./types";

export interface Ruleset {
  economy: {
    cycleDays: number; // length of one boom/bust wave
    amplitude: number; // peak swing of the cycle (0..100)
    volatility: number; // daily noise on the economy
  };
  finance: {
    costPerHead: number; // daily fully-loaded cost per employee
    revenuePerOutput: number; // revenue per unit of effective output at peak demand
    overheadRate: number; // fraction of starting capital spent daily on overhead
    compliancePerRegulation: number; // expense added per point of regulation
  };
  workforce: {
    hireChanceBase: number; // per-dept daily hire probability when healthy
    hireGrowthBonus: number; // extra hire probability from the growth push
    attritionMoraleThreshold: number; // morale below which attrition kicks in
    attritionChanceBase: number; // base daily attrition probability when unhappy
    moraleInertia: number; // 0..1 — how fast dept morale moves toward target
    rosterCap: number; // notable people materialised per department
  };
  projects: {
    spawnChanceBase: number; // base daily probability a dept starts new work
    capStartup: number; // max concurrent active projects by size
    capScaleup: number;
    capEnterprise: number;
    stallDays: number; // days of low progress before a project stalls
    stallRateThreshold: number; // progress/day below which stalling is possible
    shipInnovation: number; // innovation gained per ship (+ complexity scaling)
    shipReputation: number; // reputation gained per ship
    shipDemand: number; // demand gained per ship
    shipCashFraction: number; // fraction of project value recognised as cash
  };
  risk: {
    techDebtWeight: number;
    runwayWeight: number;
    moraleWeight: number;
    stalledWeight: number;
    smoothing: number; // 0..1 — how much prior risk carries over
  };
  world: {
    competitorsStartup: number;
    competitorsScaleup: number;
    competitorsEnterprise: number;
    regulationDrift: number; // daily upward drift of regulation
    supplyRecovery: number; // daily pull of supply back toward healthy
    competitorMoveCadence: number; // days between possible competitor moves
    regulationCadence: number; // days between regulation tightenings
    supplyShockCadence: number; // days between possible supply shocks
  };
  orchestration: {
    boardCadence: number; // days between board reviews
    reviewCadence: number; // days between lighter monthly reviews
    directiveStrength: number; // how hard a directive biases the org
    runwayConcernDays: number; // runway below this → cut costs
    moraleConcern: number; // morale below this → protect people
    techDebtConcern: number; // tech debt above this → invest in R&D
  };
  events: {
    frequency: number; // global multiplier on stochastic event odds (1 = normal)
    disastersEnabled: boolean; // allow black-swan / disaster events
  };
  strategyBias: Record<GrowthStrategy, { demand: number; spend: number; debt: number }>;
}

export const DEFAULT_RULESET: Ruleset = {
  economy: { cycleDays: 730, amplitude: 55, volatility: 3 },
  finance: { costPerHead: 520, revenuePerOutput: 2700, overheadRate: 0.0006, compliancePerRegulation: 12 },
  workforce: {
    hireChanceBase: 0.02,
    hireGrowthBonus: 0.05,
    attritionMoraleThreshold: 42,
    attritionChanceBase: 0.03,
    moraleInertia: 0.25,
    rosterCap: 8,
  },
  projects: {
    spawnChanceBase: 0.06,
    capStartup: 4,
    capScaleup: 8,
    capEnterprise: 14,
    stallDays: 45,
    stallRateThreshold: 0.35,
    shipInnovation: 3,
    shipReputation: 1.5,
    shipDemand: 2,
    shipCashFraction: 0.5,
  },
  risk: { techDebtWeight: 0.4, runwayWeight: 45, moraleWeight: 0.25, stalledWeight: 3, smoothing: 0.4 },
  world: {
    competitorsStartup: 2,
    competitorsScaleup: 3,
    competitorsEnterprise: 4,
    regulationDrift: 0.035,
    supplyRecovery: 0.05,
    competitorMoveCadence: 45,
    regulationCadence: 120,
    supplyShockCadence: 75,
  },
  orchestration: {
    boardCadence: 90,
    reviewCadence: 30,
    directiveStrength: 0.28,
    runwayConcernDays: 45,
    moraleConcern: 42,
    techDebtConcern: 62,
  },
  events: { frequency: 1, disastersEnabled: true },
  strategyBias: {
    organic: { demand: 0.12, spend: 1.0, debt: 0.04 },
    aggressive: { demand: 0.34, spend: 1.28, debt: 0.11 },
    conservative: { demand: 0.05, spend: 0.82, debt: 0.02 },
  },
};

/** Deep-merge a partial ruleset over the defaults (one level per group). */
export function resolveRuleset(partial?: DeepPartial<Ruleset>): Ruleset {
  if (!partial) return DEFAULT_RULESET;
  const d = DEFAULT_RULESET;
  return {
    economy: { ...d.economy, ...partial.economy },
    finance: { ...d.finance, ...partial.finance },
    workforce: { ...d.workforce, ...partial.workforce },
    projects: { ...d.projects, ...partial.projects },
    risk: { ...d.risk, ...partial.risk },
    world: { ...d.world, ...partial.world },
    orchestration: { ...d.orchestration, ...partial.orchestration },
    events: { ...d.events, ...partial.events },
    strategyBias: {
      organic: { ...d.strategyBias.organic, ...partial.strategyBias?.organic },
      aggressive: { ...d.strategyBias.aggressive, ...partial.strategyBias?.aggressive },
      conservative: { ...d.strategyBias.conservative, ...partial.strategyBias?.conservative },
    },
  };
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
