/**
 * The deterministic core. `advance(state) -> { state, events }`.
 *
 * This is Level 1 of the architecture — the "true intelligence" of Athena.
 * It is a PURE function: no I/O, no Date.now(), no Math.random(). Given a
 * state it always produces the same next state. Randomness comes only from the
 * serialized cursor `state.rngState`, so an entire history is reproducible and
 * replayable from a seed.
 *
 * Phase 0 evolves the org's vital signs as a small coupled system so the world
 * visibly breathes and proves determinism. Phase 1 will route these transitions
 * through the agent pools (departments, employees, projects) so the same
 * headline numbers become *emergent* rather than directly computed.
 */

import type { GrowthStrategy, Metrics, OrgEvent, OrgState, TickResult } from "../types";
import { Rng } from "./rng";
import { addDays } from "./clock";
import { clamp } from "../state";

const LOG_LIMIT = 80;

const STRATEGY_BIAS: Record<GrowthStrategy, { demand: number; spend: number; debt: number }> = {
  organic: { demand: 0.12, spend: 1.0, debt: 0.04 },
  aggressive: { demand: 0.34, spend: 1.28, debt: 0.11 },
  conservative: { demand: 0.05, spend: 0.82, debt: 0.02 },
};

/** Daily fully-loaded cost of one employee (rough, currency units). */
const COST_PER_HEAD = 520;
/** Daily revenue a fully-utilised employee generates at peak demand & brand. */
const REVENUE_PER_HEAD = 1500;

export function advance(state: OrgState): TickResult {
  if (state.status === "terminated") return { state, events: [] };

  const rng = new Rng(state.rngState);
  const m = state.metrics;
  const bias = STRATEGY_BIAS[state.config.growthStrategy];
  const events: OrgEvent[] = [];

  const day = state.day + 1;
  const date = addDays(state.date, 1);

  // ── Demand: bounded random walk nudged by strategy and reputation ─────────
  const demand = clamp(
    m.demand + rng.normal() * 1.1 + bias.demand + (m.reputation - 50) * 0.01,
  );

  // ── Revenue: workforce × demand × brand, with daily variance ──────────────
  // Per-head revenue must be able to exceed per-head cost, or every org dies.
  const brand = 0.8 + m.reputation / 250; // 0.8 … 1.2
  const revenue = Math.max(
    0,
    (demand / 100) * m.headcount * REVENUE_PER_HEAD * brand * (1 + rng.normal() * 0.06),
  );

  // ── Expenses: payroll + overhead, scaled by growth spend appetite ─────────
  const payroll = m.headcount * COST_PER_HEAD * bias.spend;
  const overhead = state.config.initialCapital * 0.0006;
  const expenses = payroll + overhead + rng.range(0, payroll * 0.04);

  const cash = m.cash + revenue - expenses;

  // ── Runway pressure drives morale and risk ────────────────────────────────
  // Only a NET burn threatens survival; a profitable org has infinite runway
  // and feels no pressure, however large its gross expenses.
  const netBurn = Math.max(0, expenses - revenue);
  const runwayDays = netBurn > 0 ? cash / netBurn : Infinity;
  const runwayPressure = clamp(60 - Math.min(60, runwayDays), 0, 60) / 60; // 0 safe → 1 dire

  const morale = clamp(
    m.morale + (m.morale < 62 ? 0.15 : -0.05) - runwayPressure * 1.4 + rng.range(-0.4, 0.4),
  );

  // ── Product health: innovation vs accumulating tech debt ──────────────────
  const innovation = clamp(m.innovation + rng.range(-0.3, 0.5) - m.techDebt * 0.004);
  const techDebt = clamp(m.techDebt + bias.debt + rng.range(-0.05, 0.15));

  const customerSat = clamp(
    m.customerSat + (innovation - 50) * 0.012 - (techDebt - 30) * 0.01 + rng.range(-0.3, 0.3),
  );
  const reputation = clamp(m.reputation + (customerSat - m.reputation) * 0.02);

  // Risk = fragility: tech debt + runway stress + low morale. Smoothed, not
  // accumulated, so it tracks the org's actual condition instead of saturating.
  const riskTarget =
    0.4 * techDebt + 45 * runwayPressure + 0.25 * Math.max(0, 60 - morale) + rng.range(-2, 2);
  const risk = clamp(0.6 * riskTarget + 0.4 * m.risk);

  const growth = clamp(((revenue - expenses) / Math.max(1, expenses)) * 40, -100, 100);

  const metrics: Metrics = {
    cash,
    revenue,
    expenses,
    headcount: m.headcount,
    morale,
    demand,
    innovation,
    techDebt,
    reputation,
    customerSat,
    risk,
    growth,
  };

  // ── Narration: emit events on meaningful threshold crossings ──────────────
  const cross = (was: number, now: number, t: number) => was >= t && now < t;
  const prevRunway = netBurn > 0 ? m.cash / netBurn : Infinity;
  if (cross(m.cash, cash, 0)) {
    events.push(evt(day, date, "finance", "critical", "Cash reserves exhausted", "The organization is insolvent. Runway has run out."));
  } else if (netBurn > 0 && prevRunway >= 30 && runwayDays < 30) {
    events.push(evt(day, date, "finance", "warn", "Runway under 30 days", `${Math.round(runwayDays)} days left at ~${Math.round(netBurn).toLocaleString()}/day net burn.`));
  }
  if (cross(m.morale, morale, 40)) {
    events.push(evt(day, date, "people", "warn", "Morale slipping", "Employee sentiment fell below 40. Attrition risk rising."));
  }
  if (m.demand < 60 && demand >= 60) {
    events.push(evt(day, date, "market", "good", "Demand surging", `Market appetite crossed 60 (now ${demand.toFixed(1)}).`));
  }
  // A periodic world event keeps the environment alive around the org.
  if (day % 30 === 0) {
    events.push(worldEvent(day, date, rng));
  }

  // `state.status` is already narrowed to alive|paused by the guard at the top.
  const status: OrgState["status"] = cash < -expenses * 5 ? "terminated" : state.status;
  if (status === "terminated") {
    events.push(evt(day, date, "system", "critical", "Simulation terminated", "The organization failed. Its history remains for study."));
  }

  const log = [...events, ...state.log].slice(0, LOG_LIMIT);

  return {
    state: { ...state, day, date, rngState: rng.state, metrics, log, status },
    events,
  };
}

/** Advance the world by n ticks, collecting every event emitted along the way. */
export function advanceBy(state: OrgState, ticks: number): TickResult {
  let cur = state;
  const all: OrgEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    const r = advance(cur);
    cur = r.state;
    all.push(...r.events);
    if (cur.status === "terminated") break;
  }
  return { state: cur, events: all };
}

function evt(
  day: number,
  date: string,
  kind: OrgEvent["kind"],
  severity: OrgEvent["severity"],
  title: string,
  detail: string,
): OrgEvent {
  return { day, date, kind, severity, title, detail };
}

const WORLD_EVENTS: Array<Omit<OrgEvent, "day" | "date">> = [
  { kind: "world", severity: "warn", title: "Competitor raises funding", detail: "A rival closed a large round. Expect pricing pressure." },
  { kind: "world", severity: "good", title: "Favourable industry tailwind", detail: "Sector sentiment improved; demand gets a lift." },
  { kind: "world", severity: "info", title: "New regulation proposed", detail: "Regulators floated rules that may raise compliance overhead." },
  { kind: "world", severity: "good", title: "Technology breakthrough", detail: "A platform advance opens room for product innovation." },
  { kind: "world", severity: "warn", title: "Supply chain disruption", detail: "Upstream constraints threaten operational throughput." },
];

function worldEvent(day: number, date: string, rng: Rng): OrgEvent {
  const base = WORLD_EVENTS[rng.int(0, WORLD_EVENTS.length - 1)];
  return { ...base, day, date };
}
