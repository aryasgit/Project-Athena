"use client";

/**
 * The decision engine (frontend). Given the live world and a proposed
 * intervention, it forks two branches from the SAME state — "do nothing" and
 * "do this" — runs both forward headlessly over a horizon, and produces a
 * decision report: what improves, what worsens, the trade-offs, and a verdict.
 *
 * Because interventions and the tick are deterministic, both branches continue
 * from the same RNG cursor, so the difference between them is attributable
 * ENTIRELY to the decision — not to luck. This is the "current timeline vs
 * alternative timeline" comparison the product exists to enable.
 */

import type { Intervention, OrgState } from "@athena/engine";
import { applyIntervention } from "@athena/engine";
import { engine } from "./engine-client";

export interface MetricDelta {
  key: string;
  label: string;
  base: number;
  branch: number;
  delta: number;
  good: boolean; // is the change in the healthy direction?
  money?: boolean;
  unit?: string;
}

export interface DecisionReport {
  horizon: number;
  deltas: MetricDelta[];
  benefits: string[];
  risks: string[];
  tradeoffs: string[];
  verdict: "Favourable" | "Marginal" | "Unfavourable";
  score: number;
  survivalBase: boolean;
  survivalBranch: boolean;
  baseCash: number[];
  branchCash: number[];
}

function runwayOf(m: OrgState["metrics"]): number {
  const net = m.revenue - m.expenses;
  return net < 0 ? m.cash / -net : Infinity;
}

/** Run a world forward `n` ticks, collecting the cash trace. */
function runForward(state: OrgState, n: number): { end: OrgState; cash: number[] } {
  let s = state;
  const cash: number[] = [s.metrics.cash];
  for (let i = 0; i < n && s.status !== "terminated"; i++) {
    s = engine.tick(s).state;
    cash.push(s.metrics.cash);
  }
  return { end: s, cash };
}

export function computeDecision(state: OrgState, iv: Intervention, horizon: number): DecisionReport {
  const base = runForward(state, horizon);
  const branch = runForward(applyIntervention(state, iv), horizon);
  const b = base.end.metrics;
  const x = branch.end.metrics;

  // metric | inverse (lower is better) | money | small-change threshold
  const specs: Array<[string, string, (m: OrgState["metrics"]) => number, boolean, boolean, number]> = [
    ["cash", "Cash", (m) => m.cash, false, true, Math.max(50000, Math.abs(b.cash) * 0.02)],
    ["runway", "Runway (days)", (m) => Math.min(3650, runwayOf(m)), false, false, 20],
    ["revenue", "Revenue/day", (m) => m.revenue, false, true, Math.max(3000, b.revenue * 0.03)],
    ["headcount", "Headcount", (m) => m.headcount, false, false, 2],
    ["demand", "Demand", (m) => m.demand, false, false, 1.5],
    ["morale", "Morale", (m) => m.morale, false, false, 1.5],
    ["innovation", "Innovation", (m) => m.innovation, false, false, 1.5],
    ["reputation", "Reputation", (m) => m.reputation, false, false, 1.5],
    ["techDebt", "Tech debt", (m) => m.techDebt, true, false, 1.5],
    ["risk", "Risk", (m) => m.risk, true, false, 1.5],
  ];

  const deltas: MetricDelta[] = specs.map(([key, label, get, inverse, money]) => {
    const bv = get(b);
    const xv = get(x);
    const delta = xv - bv;
    const good = inverse ? delta < 0 : delta > 0;
    return { key, label, base: bv, branch: xv, delta, good, money };
  });

  const survivalBase = base.end.status !== "terminated";
  const survivalBranch = branch.end.status !== "terminated";

  // benefits / risks from significant, sign-consistent deltas
  const sig = (key: string) => specs.find((s) => s[0] === key)![5];
  const phrase = (dl: MetricDelta) => {
    const mag = dl.money ? `$${Math.abs(Math.round(dl.delta)).toLocaleString()}` : Math.abs(dl.delta).toFixed(0);
    const dir = dl.delta >= 0 ? "+" : "−";
    return `${dl.label} ${dir}${mag}`;
  };
  const benefits = deltas.filter((d) => d.good && Math.abs(d.delta) >= sig(d.key)).map(phrase);
  const risks = deltas.filter((d) => !d.good && Math.abs(d.delta) >= sig(d.key)).map(phrase);

  // trade-offs: short-term (mid horizon) vs long-term direction of cash
  const mid = Math.floor(horizon / 2);
  const shortCash = (branch.cash[mid] ?? branch.cash[branch.cash.length - 1]) - (base.cash[mid] ?? 0);
  const longCash = x.cash - b.cash;
  const tradeoffs: string[] = [];
  if (shortCash < 0 && longCash > 0) tradeoffs.push("Costs cash now, but the position is stronger by the horizon.");
  if (shortCash > 0 && longCash < 0) tradeoffs.push("Helps cash near-term, but the org is weaker later.");
  const debt = deltas.find((d) => d.key === "techDebt")!;
  const innov = deltas.find((d) => d.key === "innovation")!;
  if (innov.delta > 2 && debt.delta > 1) tradeoffs.push("Buys innovation at the cost of accumulating tech debt.");
  const morale = deltas.find((d) => d.key === "morale")!;
  const cash = deltas.find((d) => d.key === "cash")!;
  if (cash.delta > 0 && morale.delta < -2) tradeoffs.push("Extends runway but at a cost to morale.");

  // verdict score — weighted, normalized to roughly [-3, 3]
  let score =
    (cash.delta / Math.max(1, Math.abs(b.cash))) * 3 -
    deltas.find((d) => d.key === "risk")!.delta * 0.04 +
    deltas.find((d) => d.key === "demand")!.delta * 0.03 +
    innov.delta * 0.03 +
    morale.delta * 0.04;
  if (survivalBranch && !survivalBase) score += 3;
  if (!survivalBranch && survivalBase) score -= 4;

  const verdict = score > 0.35 ? "Favourable" : score > -0.25 ? "Marginal" : "Unfavourable";

  return {
    horizon,
    deltas,
    benefits: benefits.slice(0, 5),
    risks: risks.slice(0, 5),
    tradeoffs: tradeoffs.slice(0, 3),
    verdict,
    score,
    survivalBase,
    survivalBranch,
    baseCash: base.cash,
    branchCash: branch.cash,
  };
}
