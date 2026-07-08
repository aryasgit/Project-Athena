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

// ── Curated editable parameters (the advanced console) ──────────────────────

export interface ParamField {
  group: string;
  label: string;
  get: (r: Ruleset) => number;
  set: (r: Ruleset, v: number) => Ruleset;
  min: number;
  max: number;
  step: number;
}

const f = (
  group: string,
  label: string,
  get: (r: Ruleset) => number,
  set: (r: Ruleset, v: number) => Ruleset,
  min: number,
  max: number,
  step: number,
): ParamField => ({ group, label, get, set, min, max, step });

export const PARAM_FIELDS: ParamField[] = [
  f("Economy", "Cycle length (days)", (r) => r.economy.cycleDays, (r, v) => ({ ...r, economy: { ...r.economy, cycleDays: v } }), 180, 1460, 10),
  f("Economy", "Amplitude", (r) => r.economy.amplitude, (r, v) => ({ ...r, economy: { ...r.economy, amplitude: v } }), 0, 100, 1),
  f("Economy", "Volatility", (r) => r.economy.volatility, (r, v) => ({ ...r, economy: { ...r.economy, volatility: v } }), 0, 15, 0.5),
  f("Finance", "Cost / head / day", (r) => r.finance.costPerHead, (r, v) => ({ ...r, finance: { ...r.finance, costPerHead: v } }), 100, 2000, 10),
  f("Finance", "Revenue / output", (r) => r.finance.revenuePerOutput, (r, v) => ({ ...r, finance: { ...r.finance, revenuePerOutput: v } }), 500, 6000, 50),
  f("Finance", "Compliance / regulation", (r) => r.finance.compliancePerRegulation, (r, v) => ({ ...r, finance: { ...r.finance, compliancePerRegulation: v } }), 0, 60, 1),
  f("Workforce", "Hire chance", (r) => r.workforce.hireChanceBase, (r, v) => ({ ...r, workforce: { ...r.workforce, hireChanceBase: v } }), 0, 0.2, 0.005),
  f("Workforce", "Attrition threshold", (r) => r.workforce.attritionMoraleThreshold, (r, v) => ({ ...r, workforce: { ...r.workforce, attritionMoraleThreshold: v } }), 0, 80, 1),
  f("Workforce", "Morale inertia", (r) => r.workforce.moraleInertia, (r, v) => ({ ...r, workforce: { ...r.workforce, moraleInertia: v } }), 0.05, 0.6, 0.05),
  f("Projects", "Spawn chance", (r) => r.projects.spawnChanceBase, (r, v) => ({ ...r, projects: { ...r.projects, spawnChanceBase: v } }), 0, 0.3, 0.01),
  f("Projects", "Stall after (days)", (r) => r.projects.stallDays, (r, v) => ({ ...r, projects: { ...r.projects, stallDays: v } }), 15, 120, 5),
  f("Projects", "Ship cash fraction", (r) => r.projects.shipCashFraction, (r, v) => ({ ...r, projects: { ...r.projects, shipCashFraction: v } }), 0, 1, 0.05),
  f("World", "Scaleup competitors", (r) => r.world.competitorsScaleup, (r, v) => ({ ...r, world: { ...r.world, competitorsScaleup: v } }), 0, 10, 1),
  f("World", "Regulation drift", (r) => r.world.regulationDrift, (r, v) => ({ ...r, world: { ...r.world, regulationDrift: v } }), 0, 0.2, 0.005),
  f("Board", "Board cadence (days)", (r) => r.orchestration.boardCadence, (r, v) => ({ ...r, orchestration: { ...r.orchestration, boardCadence: v } }), 30, 180, 5),
  f("Board", "Directive strength", (r) => r.orchestration.directiveStrength, (r, v) => ({ ...r, orchestration: { ...r.orchestration, directiveStrength: v } }), 0, 0.6, 0.02),
  f("Events", "Event frequency", (r) => r.events.frequency, (r, v) => ({ ...r, events: { ...r.events, frequency: v } }), 0, 3, 0.1),
];
