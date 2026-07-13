/**
 * Interventions — the decision layer.
 *
 * An intervention is an editable lever the user pulls on the world. It is a PURE
 * state transform (no RNG): given a world and an intervention, it returns the
 * changed world plus a record for the journal. Purity is what lets the app fork
 * a world, run "do nothing" against "do this" down two branches, and attribute
 * the difference entirely to the decision.
 *
 * Effects come in two forms: immediate (a layoff removes heads now) and standing
 * policies (raising prices installs a price index the tick reads every day).
 */

import type { DirectiveKind, Intervention, InterventionKind, OrgState, Policies } from "../types";
import { clamp } from "../state";

const DIRECTIVE_LABEL: Record<DirectiveKind, string> = {
  "cut-costs": "Cut costs",
  "invest-rnd": "Invest in R&D",
  "seize-market": "Seize the market",
  "protect-people": "Protect the team",
  steady: "Stay the course",
};

export interface InterventionDef {
  kind: InterventionKind;
  label: string;
  /** what decision it represents, in plain language */
  description: string;
  /** whether it exposes an adjustable amount, and how to read it */
  amount?: { label: string; min: number; max: number; step: number; def: number; unit?: string };
  /** whether it needs a target (a department / competitor) */
  target?: "department" | "competitor";
}

export const INTERVENTIONS: InterventionDef[] = [
  { kind: "rnd-budget", label: "Increase R&D budget", description: "Divert spend into research — lifts innovation and shipping speed, at a daily cash cost.", amount: { label: "R&D intensity", min: 0.1, max: 1, step: 0.1, def: 0.4 } },
  { kind: "marketing-push", label: "Launch marketing push", description: "Buy demand — raises market appetite, at a daily cash cost.", amount: { label: "Push intensity", min: 0.1, max: 1, step: 0.1, def: 0.4 } },
  { kind: "raise-prices", label: "Raise prices", description: "Higher margin per sale, but demand softens as buyers balk.", amount: { label: "Increase", min: 5, max: 40, step: 5, def: 15, unit: "%" } },
  { kind: "cut-prices", label: "Cut prices", description: "Win share and volume, at the cost of margin.", amount: { label: "Decrease", min: 5, max: 40, step: 5, def: 15, unit: "%" } },
  { kind: "hire", label: "Hire aggressively", description: "Add headcount to grow capacity — signing costs now, payroll forever.", amount: { label: "Heads", min: 5, max: 100, step: 5, def: 20 }, target: "department" },
  { kind: "layoff", label: "Lay off staff", description: "Cut payroll to extend runway — morale and reputation take the hit.", amount: { label: "Heads", min: 5, max: 100, step: 5, def: 20 }, target: "department" },
  { kind: "freeze-hiring", label: "Freeze hiring", description: "Stop all new headcount to preserve cash." },
  { kind: "resume-hiring", label: "Resume hiring", description: "Lift the hiring freeze." },
  { kind: "pay-down-debt", label: "Pay down tech debt", description: "Fund a cleanup — retires debt and steadies risk, but diverts effort from features.", amount: { label: "Debt retired", min: 5, max: 40, step: 5, def: 20 } },
  { kind: "acquire", label: "Acquire a competitor", description: "Buy out a rival — a demand and reputation jump for a large cash outlay and integration risk.", target: "competitor" },
];

export function interventionLabel(iv: Intervention): string {
  const def = INTERVENTIONS.find((d) => d.kind === iv.kind);
  if (iv.kind === "set-directive" && iv.directive) return `Set directive: ${DIRECTIVE_LABEL[iv.directive]}`;
  return def?.label ?? iv.kind;
}

/** Apply an intervention to a world. Pure — no RNG consumed. */
export function applyIntervention(state: OrgState, iv: Intervention): OrgState {
  const m = { ...state.metrics };
  const policies: Policies = { ...state.policies };
  let departments = state.agents.departments;
  let employees = state.agents.employees;
  let world = state.world;
  let directive = state.directive;
  let note = "";
  const amt = iv.amount ?? 0;

  const targetDept = () =>
    departments.find((d) => d.id === iv.deptId) ??
    [...departments].sort((a, b) => b.headcount - a.headcount)[0];

  switch (iv.kind) {
    case "rnd-budget":
      policies.rndBudget = clamp(amt, 0, 1);
      m.innovation = clamp(m.innovation + 2);
      note = `R&D intensity set to ${(amt * 100).toFixed(0)}%.`;
      break;
    case "marketing-push":
      policies.marketing = clamp(amt, 0, 1);
      m.demand = clamp(m.demand + 3);
      note = `Marketing push at ${(amt * 100).toFixed(0)}% intensity.`;
      break;
    case "raise-prices":
      policies.priceIndex = clamp(policies.priceIndex * (1 + amt / 100), 0.4, 3);
      m.reputation = clamp(m.reputation - 1);
      note = `List prices raised ${amt}%.`;
      break;
    case "cut-prices":
      policies.priceIndex = clamp(policies.priceIndex * (1 - amt / 100), 0.4, 3);
      m.demand = clamp(m.demand + 3);
      note = `List prices cut ${amt}%.`;
      break;
    case "hire": {
      const d = targetDept();
      departments = departments.map((x) => (x.id === d.id ? { ...x, headcount: x.headcount + amt } : x));
      m.headcount += amt;
      m.cash -= amt * state.config.initialCapital * 0.000004 * 1000; // signing/onboarding
      m.morale = clamp(m.morale + 1);
      note = `Hired ${amt} into ${d.name}.`;
      break;
    }
    case "layoff": {
      const d = targetDept();
      const cut = Math.min(amt, d.headcount - 1);
      departments = departments.map((x) => (x.id === d.id ? { ...x, headcount: Math.max(1, x.headcount - cut) } : x));
      m.headcount = Math.max(1, m.headcount - cut);
      m.morale = clamp(m.morale - 9);
      m.reputation = clamp(m.reputation - 2);
      m.risk = clamp(m.risk + 3);
      note = `Laid off ${cut} from ${d.name}.`;
      break;
    }
    case "freeze-hiring":
      policies.hiringFrozen = true;
      note = "Hiring frozen.";
      break;
    case "resume-hiring":
      policies.hiringFrozen = false;
      note = "Hiring resumed.";
      break;
    case "pay-down-debt":
      m.techDebt = clamp(m.techDebt - amt);
      m.cash -= amt * m.headcount * 120;
      m.innovation = clamp(m.innovation - 1);
      m.risk = clamp(m.risk - 2);
      note = `Retired ${amt} points of tech debt.`;
      break;
    case "acquire": {
      const target = world.competitors.find((c) => c.id === iv.competitorId) ?? world.competitors[0];
      if (target) {
        world = { ...world, competitors: world.competitors.filter((c) => c.id !== target.id) };
        m.cash -= m.cash * 0.3;
        m.demand = clamp(m.demand + 8);
        m.reputation = clamp(m.reputation + 5);
        m.techDebt = clamp(m.techDebt + 5);
        m.risk = clamp(m.risk + 6);
        note = `Acquired ${target.name}.`;
      } else {
        note = "No competitor to acquire.";
      }
      break;
    }
    case "set-directive":
      if (iv.directive) {
        directive = { kind: iv.directive, label: DIRECTIVE_LABEL[iv.directive], sinceDay: state.day };
        note = `Directive set: ${DIRECTIVE_LABEL[iv.directive]}.`;
      }
      break;
  }

  return {
    ...state,
    metrics: m,
    policies,
    directive,
    world,
    agents: { ...state.agents, departments, employees },
    decisions: [
      ...state.decisions,
      { day: state.day, date: state.date, kind: iv.kind, label: interventionLabel(iv), note },
    ],
    log: [
      { day: state.day, date: state.date, kind: "board", severity: "info", title: `Decision: ${interventionLabel(iv)}`, detail: note },
      ...state.log,
    ].slice(0, 80),
  };
}
