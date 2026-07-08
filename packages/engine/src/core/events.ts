/**
 * The event & disaster engine — data-driven, not four hardcoded strings.
 *
 * A registry of situations the world can throw at the org: internal shake-ups,
 * market swings, macro shocks and black-swan disasters. Each has a trigger
 * probability (a function of the org's current state), a cooldown, and an effect
 * that perturbs the metrics (and sometimes the people). Deterministic: all
 * randomness comes from the shared seeded cursor. Extensible: add a row, get a
 * new possible history. Disasters can be switched off via the ruleset.
 */

import type { EventKind, EventSeverity, OrgEvent, OrgState } from "../types";
import type { Ruleset } from "../ruleset";
import type { Rng } from "./rng";

export type EventClass = "internal" | "market" | "macro" | "disaster";

/** A perturbation to the org. Numeric fields are additive deltas. */
export interface EventFx {
  cash?: number;
  demand?: number;
  reputation?: number;
  morale?: number;
  risk?: number;
  customerSat?: number;
  techDebt?: number;
  innovation?: number;
  loseKeyPerson?: boolean;
}

export interface EventDef {
  id: string;
  cls: EventClass;
  kind: EventKind;
  severity: EventSeverity;
  minDay: number;
  cooldown: number; // days before it can recur
  /** per-tick probability given the org's state (before global frequency mult) */
  chance: (s: OrgState) => number;
  apply: (s: OrgState, rng: Rng) => { title: string; detail: string; fx: EventFx };
}

const cashPct = (s: OrgState, p: number) => Math.round(s.metrics.cash * p);

export const EVENTS: EventDef[] = [
  // ── Internal ──────────────────────────────────────────────────────────────
  {
    id: "breakthrough",
    cls: "internal",
    kind: "product",
    severity: "good",
    minDay: 20,
    cooldown: 60,
    chance: (s) => (s.metrics.innovation > 60 ? 0.004 : 0.001),
    apply: () => ({
      title: "R&D breakthrough",
      detail: "A research effort paid off — a genuine product edge opens up.",
      fx: { innovation: 6, demand: 4, reputation: 3 },
    }),
  },
  {
    id: "key-departure",
    cls: "internal",
    kind: "people",
    severity: "warn",
    minDay: 30,
    cooldown: 45,
    chance: (s) => (s.metrics.morale < 50 ? 0.006 : 0.0015),
    apply: () => ({
      title: "A key leader departs",
      detail: "A senior figure resigned. Knowledge walks out the door; morale dips.",
      fx: { morale: -5, risk: 5, innovation: -3, loseKeyPerson: true },
    }),
  },
  {
    id: "burnout",
    cls: "internal",
    kind: "people",
    severity: "warn",
    minDay: 40,
    cooldown: 40,
    chance: (s) => (s.metrics.morale < 45 ? 0.005 : 0.0008),
    apply: () => ({
      title: "Burnout spreads",
      detail: "Sustained pressure is showing. Teams are running hot and slowing down.",
      fx: { morale: -6, techDebt: 4 },
    }),
  },
  {
    id: "culture-award",
    cls: "internal",
    kind: "people",
    severity: "good",
    minDay: 60,
    cooldown: 120,
    chance: (s) => (s.metrics.morale > 65 ? 0.003 : 0.0005),
    apply: () => ({
      title: "Named a top place to work",
      detail: "External recognition for culture. Morale and employer brand rise.",
      fx: { morale: 5, reputation: 4 },
    }),
  },

  // ── Market ──────────────────────────────────────────────────────────────
  {
    id: "viral-success",
    cls: "market",
    kind: "market",
    severity: "good",
    minDay: 25,
    cooldown: 90,
    chance: (s) => (s.metrics.demand > 65 && s.metrics.reputation > 55 ? 0.004 : 0.001),
    apply: () => ({
      title: "The product goes viral",
      detail: "A wave of organic attention. Demand spikes and the brand carries further.",
      fx: { demand: 9, reputation: 6 },
    }),
  },
  {
    id: "pricing-war",
    cls: "market",
    kind: "market",
    severity: "warn",
    minDay: 45,
    cooldown: 70,
    chance: (s) => (s.world.competitors.some((c) => c.strength > 60) ? 0.004 : 0.0015),
    apply: () => ({
      title: "A price war erupts",
      detail: "Rivals are undercutting hard. Demand softens and margins compress.",
      fx: { demand: -6, reputation: -1 },
    }),
  },
  {
    id: "partnership",
    cls: "market",
    kind: "market",
    severity: "good",
    minDay: 50,
    cooldown: 100,
    chance: (s) => (s.metrics.reputation > 55 ? 0.003 : 0.001),
    apply: (s) => ({
      title: "Major partnership signed",
      detail: "A distribution deal lands — new demand and a cash advance.",
      fx: { demand: 6, cash: cashPct(s, 0.04) },
    }),
  },
  {
    id: "churn-spike",
    cls: "market",
    kind: "market",
    severity: "warn",
    minDay: 40,
    cooldown: 60,
    chance: (s) => (s.metrics.customerSat < 45 ? 0.006 : 0.001),
    apply: () => ({
      title: "Customer churn spikes",
      detail: "Unhappy customers are leaving. Demand and reputation slip.",
      fx: { demand: -5, reputation: -4, customerSat: -3 },
    }),
  },

  // ── Macro ──────────────────────────────────────────────────────────────
  {
    id: "market-crash",
    cls: "macro",
    kind: "world",
    severity: "critical",
    minDay: 60,
    cooldown: 180,
    chance: (s) => (s.world.economy < -35 ? 0.006 : 0.0002),
    apply: (s) => ({
      title: "Markets crash",
      detail: "A broad downturn hits. Demand contracts, valuations fall, risk jumps.",
      fx: { demand: -12, cash: -cashPct(s, 0.03), risk: 10 },
    }),
  },
  {
    id: "boom-tailwind",
    cls: "macro",
    kind: "world",
    severity: "good",
    minDay: 40,
    cooldown: 150,
    chance: (s) => (s.world.economy > 35 ? 0.005 : 0.0003),
    apply: () => ({
      title: "Sector boom",
      detail: "Capital and attention flood the sector. Demand accelerates.",
      fx: { demand: 8, reputation: 2 },
    }),
  },
  {
    id: "talent-shortage",
    cls: "macro",
    kind: "people",
    severity: "warn",
    minDay: 60,
    cooldown: 120,
    chance: () => 0.0015,
    apply: () => ({
      title: "Talent market tightens",
      detail: "Hiring gets harder and pricier. Wage pressure weighs on morale.",
      fx: { morale: -3, risk: 3 },
    }),
  },

  // ── Disasters (black swans; gated by ruleset.events.disastersEnabled) ─────
  {
    id: "data-breach",
    cls: "disaster",
    kind: "world",
    severity: "critical",
    minDay: 90,
    cooldown: 240,
    chance: (s) => 0.0009 + (s.metrics.techDebt > 60 ? 0.0015 : 0),
    apply: (s) => ({
      title: "Data breach disclosed",
      detail: "A security incident goes public. Trust, cash and risk all take the hit.",
      fx: { reputation: -12, customerSat: -8, cash: -cashPct(s, 0.05), risk: 14 },
    }),
  },
  {
    id: "lawsuit",
    cls: "disaster",
    kind: "finance",
    severity: "critical",
    minDay: 90,
    cooldown: 220,
    chance: () => 0.0008,
    apply: (s) => ({
      title: "Hit with a major lawsuit",
      detail: "Litigation lands. Legal costs bite and the outcome is uncertain.",
      fx: { cash: -cashPct(s, 0.06), risk: 10, reputation: -4 },
    }),
  },
  {
    id: "product-recall",
    cls: "disaster",
    kind: "product",
    severity: "critical",
    minDay: 120,
    cooldown: 220,
    chance: (s) => (s.metrics.techDebt > 55 ? 0.0016 : 0.0004),
    apply: (s) => ({
      title: "Forced product recall",
      detail: "A serious defect ships. Customers pull back and remediation is costly.",
      fx: { reputation: -9, customerSat: -10, cash: -cashPct(s, 0.04), techDebt: -6 },
    }),
  },
  {
    id: "major-outage",
    cls: "disaster",
    kind: "product",
    severity: "warn",
    minDay: 60,
    cooldown: 100,
    chance: (s) => (s.metrics.techDebt > 50 ? 0.002 : 0.0005),
    apply: () => ({
      title: "Major outage",
      detail: "The service went down for hours. Customers are unhappy and vocal.",
      fx: { customerSat: -7, reputation: -3 },
    }),
  },
  {
    id: "acquisition-offer",
    cls: "disaster",
    kind: "finance",
    severity: "good",
    minDay: 180,
    cooldown: 300,
    chance: (s) => (s.metrics.reputation > 60 && s.metrics.growth > 5 ? 0.0015 : 0.0002),
    apply: () => ({
      title: "Acquisition interest",
      detail: "A larger player is circling. Validation lifts the brand and confidence.",
      fx: { reputation: 6, demand: 3 },
    }),
  },
];

/** Roll the registry for this tick. Returns fired events, their effects, and updated cooldowns. */
export function rollEvents(
  state: OrgState,
  rng: Rng,
  day: number,
  date: string,
  R: Ruleset,
): { events: OrgEvent[]; fx: EventFx[]; cooldowns: Record<string, number> } {
  const cooldowns = { ...(state.cooldowns ?? {}) };
  const out: OrgEvent[] = [];
  const fx: EventFx[] = [];
  let fired = 0;

  for (const def of EVENTS) {
    if (fired >= 2) break; // at most a couple of shocks per day
    if (day < def.minDay) continue;
    if (def.cls === "disaster" && !R.events.disastersEnabled) continue;
    const last = cooldowns[def.id];
    if (last !== undefined && day - last < def.cooldown) continue;

    const p = def.chance(state) * R.events.frequency;
    if (!rng.chance(p)) continue;

    const { title, detail, fx: f } = def.apply(state, rng);
    out.push({ day, date, kind: def.kind, severity: def.severity, title, detail });
    fx.push(f);
    cooldowns[def.id] = day;
    fired++;
  }

  return { events: out, fx, cooldowns };
}
