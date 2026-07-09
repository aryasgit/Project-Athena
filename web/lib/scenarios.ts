"use client";

/**
 * Research scaffolding: named scenarios (ruleset presets) and a curated set of
 * editable parameters for the advanced console. The full ruleset is always
 * editable via scenario-file import/export; this exposes the highest-impact
 * knobs as direct controls.
 */

import type { DeepPartial, Ruleset } from "@athena/engine";

export interface Scenario {
  id: string;
  name: string;
  description: string;
  ruleset: DeepPartial<Ruleset>;
}

export const SCENARIOS: Scenario[] = [
  { id: "baseline", name: "Baseline", description: "Balanced defaults — the reference model.", ruleset: {} },
  {
    id: "recession",
    name: "Recession Stress Test",
    description: "Deep, volatile downturns and frequent shocks. Can the org survive?",
    ruleset: { economy: { amplitude: 80, volatility: 8 }, events: { frequency: 1.7, disastersEnabled: true } },
  },
  {
    id: "hypergrowth",
    name: "Hypergrowth Boom",
    description: "Sustained tailwinds, cheap capital, fast shipping.",
    ruleset: {
      economy: { amplitude: 35, volatility: 2 },
      projects: { spawnChanceBase: 0.12 },
      strategyBias: { aggressive: { demand: 0.45, spend: 1.2, debt: 0.13 } },
    },
  },
  {
    id: "cutthroat",
    name: "Cutthroat Market",
    description: "More, stronger rivals moving often. Pricing pressure everywhere.",
    ruleset: {
      world: { competitorsStartup: 4, competitorsScaleup: 6, competitorsEnterprise: 8, competitorMoveCadence: 25 },
      events: { frequency: 1.4, disastersEnabled: true },
    },
  },
  {
    id: "regulated",
    name: "Heavily Regulated",
    description: "Rising compliance burden and frequent regulatory tightening.",
    ruleset: {
      world: { regulationCadence: 60, regulationDrift: 0.08 },
      finance: { compliancePerRegulation: 26 },
    },
  },
  {
    id: "calm",
    name: "Calm Waters",
    description: "Low volatility, no disasters — study the org's own internal dynamics.",
    ruleset: { economy: { amplitude: 20, volatility: 1 }, events: { frequency: 0.5, disastersEnabled: false } },
  },
];

// ── Editable parameters (the advanced console) ──────────────────────────────

export interface ParamField {
  group: string;
  label: string;
  help: string;
  unit?: string;
  get: (r: Ruleset) => number;
  set: (r: Ruleset, v: number) => Ruleset;
  min: number;
  max: number;
  step: number;
}

/** One-line description of what each group governs. */
export const GROUP_HELP: Record<string, string> = {
  Economy: "The macro cycle the org rides — booms and recessions that move demand and revenue.",
  Finance: "How money is made and spent: unit economics and fixed burdens.",
  Workforce: "Hiring, attrition and how quickly team mood shifts.",
  Projects: "How work gets created, progresses, ships, or stalls into debt.",
  Risk: "How fragility is scored from debt, runway, morale and stalled work.",
  World: "The environment outside the org: rivals, regulators, supply chains.",
  Board: "The governance rhythm — how often and how hard leadership steers.",
  Events: "The stochastic shocks: how often things happen, and whether disasters can.",
};

const f = (
  group: string,
  label: string,
  help: string,
  get: (r: Ruleset) => number,
  set: (r: Ruleset, v: number) => Ruleset,
  min: number,
  max: number,
  step: number,
  unit?: string,
): ParamField => ({ group, label, help, get, set, min, max, step, unit });

const setIn =
  <K extends keyof Ruleset, F extends keyof Ruleset[K]>(k: K, field: F) =>
  (r: Ruleset, v: number): Ruleset => ({ ...r, [k]: { ...r[k], [field]: v } });

export const PARAM_FIELDS: ParamField[] = [
  // Economy
  f("Economy", "Cycle length", "Days for one full boom→bust→boom wave. Shorter = choppier markets.", (r) => r.economy.cycleDays, setIn("economy", "cycleDays"), 180, 1460, 10, "days"),
  f("Economy", "Amplitude", "How extreme booms and recessions get (0 = flat, 100 = violent swings).", (r) => r.economy.amplitude, setIn("economy", "amplitude"), 0, 100, 1),
  f("Economy", "Volatility", "Day-to-day noise on top of the cycle. Higher = jumpier.", (r) => r.economy.volatility, setIn("economy", "volatility"), 0, 15, 0.5),
  // Finance
  f("Finance", "Cost per head", "Daily fully-loaded cost of one employee. Raise it and payroll bites harder.", (r) => r.finance.costPerHead, setIn("finance", "costPerHead"), 100, 2000, 10, "$/day"),
  f("Finance", "Revenue per output", "Revenue a fully-utilised employee generates at peak demand. The top line's engine.", (r) => r.finance.revenuePerOutput, setIn("finance", "revenuePerOutput"), 500, 6000, 50, "$"),
  f("Finance", "Overhead rate", "Daily overhead as a fraction of starting capital. Fixed drag.", (r) => r.finance.overheadRate, setIn("finance", "overheadRate"), 0, 0.003, 0.0001),
  f("Finance", "Compliance cost", "Expense added per point of regulation. High in finance/biotech.", (r) => r.finance.compliancePerRegulation, setIn("finance", "compliancePerRegulation"), 0, 60, 1, "$/pt"),
  // Workforce
  f("Workforce", "Hire chance", "Daily probability a healthy department adds a head.", (r) => r.workforce.hireChanceBase, setIn("workforce", "hireChanceBase"), 0, 0.2, 0.005),
  f("Workforce", "Growth hire bonus", "Extra hire probability when the org is pushing growth.", (r) => r.workforce.hireGrowthBonus, setIn("workforce", "hireGrowthBonus"), 0, 0.2, 0.005),
  f("Workforce", "Attrition threshold", "Morale below this triggers people leaving. Higher = a more fragile team.", (r) => r.workforce.attritionMoraleThreshold, setIn("workforce", "attritionMoraleThreshold"), 0, 80, 1),
  f("Workforce", "Attrition chance", "Base daily probability an unhappy team loses someone.", (r) => r.workforce.attritionChanceBase, setIn("workforce", "attritionChanceBase"), 0, 0.15, 0.005),
  f("Workforce", "Morale inertia", "How fast department morale moves toward its target (0 = sticky, 1 = twitchy).", (r) => r.workforce.moraleInertia, setIn("workforce", "moraleInertia"), 0.05, 0.6, 0.05),
  // Projects
  f("Projects", "Spawn chance", "Daily probability a department kicks off new work.", (r) => r.projects.spawnChanceBase, setIn("projects", "spawnChanceBase"), 0, 0.3, 0.01),
  f("Projects", "Stall after", "Days of low progress before a project stalls into tech debt.", (r) => r.projects.stallDays, setIn("projects", "stallDays"), 15, 120, 5, "days"),
  f("Projects", "Ship → innovation", "Innovation gained each time a project ships.", (r) => r.projects.shipInnovation, setIn("projects", "shipInnovation"), 0, 12, 0.5),
  f("Projects", "Ship → cash", "Fraction of a shipped project's value recognised as cash.", (r) => r.projects.shipCashFraction, setIn("projects", "shipCashFraction"), 0, 1, 0.05),
  // Risk
  f("Risk", "Tech-debt weight", "How much accumulated debt drives the risk score.", (r) => r.risk.techDebtWeight, setIn("risk", "techDebtWeight"), 0, 1, 0.05),
  f("Risk", "Runway weight", "How sharply short runway spikes risk.", (r) => r.risk.runwayWeight, setIn("risk", "runwayWeight"), 0, 80, 5),
  f("Risk", "Smoothing", "How much prior risk carries over (0 = instant, 1 = frozen).", (r) => r.risk.smoothing, setIn("risk", "smoothing"), 0, 0.9, 0.05),
  // World
  f("World", "Competitors (scaleup)", "How many rivals a scaleup faces.", (r) => r.world.competitorsScaleup, setIn("world", "competitorsScaleup"), 0, 10, 1),
  f("World", "Regulation drift", "Daily upward creep of the compliance burden.", (r) => r.world.regulationDrift, setIn("world", "regulationDrift"), 0, 0.2, 0.005),
  f("World", "Supply recovery", "How fast supply heals after a shock.", (r) => r.world.supplyRecovery, setIn("world", "supplyRecovery"), 0.01, 0.2, 0.01),
  f("World", "Rival move cadence", "Days between possible competitor offensives.", (r) => r.world.competitorMoveCadence, setIn("world", "competitorMoveCadence"), 15, 120, 5, "days"),
  // Board
  f("Board", "Board cadence", "Days between board reviews that reset the directive.", (r) => r.orchestration.boardCadence, setIn("orchestration", "boardCadence"), 30, 180, 5, "days"),
  f("Board", "Directive strength", "How hard a standing directive biases the org.", (r) => r.orchestration.directiveStrength, setIn("orchestration", "directiveStrength"), 0, 0.6, 0.02),
  f("Board", "Runway concern", "Runway below this makes the board order cost cuts.", (r) => r.orchestration.runwayConcernDays, setIn("orchestration", "runwayConcernDays"), 15, 120, 5, "days"),
  f("Board", "Tech-debt concern", "Debt above this makes the board invest in R&D.", (r) => r.orchestration.techDebtConcern, setIn("orchestration", "techDebtConcern"), 30, 90, 1),
  // Events
  f("Events", "Event frequency", "Global multiplier on how often shocks fire (1 = normal).", (r) => r.events.frequency, setIn("events", "frequency"), 0, 3, 0.1, "×"),
];
