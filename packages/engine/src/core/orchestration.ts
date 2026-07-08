/**
 * Level 2 — Workflow Orchestration (mandatory, no LLM).
 *
 * Where the world half of Phase 2 pushes on the org from outside, orchestration
 * gives the org its own *rhythm* from inside: scheduled board meetings, quarterly
 * and monthly reviews that fire on deterministic cadences. The board reads the
 * org's condition (rule-based) and sets a standing DIRECTIVE that biases the next
 * quarter — so the organization visibly self-corrects. This is a plain scheduler;
 * an n8n adapter could later drive the same cadences without changing the engine.
 */

import type { Directive, DirectiveKind, OrgEvent, OrgState } from "../types";
import type { Ruleset } from "../ruleset";

const DIRECTIVE_LABEL: Record<DirectiveKind, string> = {
  "cut-costs": "Cut costs — extend runway",
  "invest-rnd": "Invest in R&D — pay down debt",
  "seize-market": "Seize the market",
  "protect-people": "Protect the team",
  steady: "Stay the course",
};

/** Runs the scheduled workflows for this tick. Pure. */
export function runOrchestration(
  state: OrgState,
  day: number,
  date: string,
  R: Ruleset,
): { events: OrgEvent[]; directive: Directive } {
  const events: OrgEvent[] = [];
  let directive = state.directive;

  // Board meeting every quarter: assess and set the directive.
  if (day > 0 && day % R.orchestration.boardCadence === 0) {
    const quarter = Math.round(day / R.orchestration.boardCadence);
    const kind = decideDirective(state, R);
    directive = { kind, label: DIRECTIVE_LABEL[kind], sinceDay: day };

    const m = state.metrics;
    const verdict = m.growth > 15 ? "thriving" : m.growth >= 0 ? "steady" : m.risk > 60 ? "critical" : "strained";
    const shipped = state.agents.projects.filter((p) => p.status === "shipped").length;
    events.push({
      day,
      date,
      kind: "board",
      severity: verdict === "critical" ? "critical" : verdict === "thriving" ? "good" : "info",
      title: `Q${quarter} board review — ${verdict}`,
      detail: `Cash ${money(m.cash)}, growth ${pct(m.growth)}, morale ${m.morale.toFixed(0)}, risk ${m.risk.toFixed(0)}. ${shipped} projects shipped to date. New directive: ${directive.label}.`,
    });
  } else if (day > 0 && day % R.orchestration.reviewCadence === 0) {
    // lighter monthly review
    const m = state.metrics;
    events.push({
      day,
      date,
      kind: "board",
      severity: "info",
      title: "Monthly review",
      detail: `${m.headcount} people · revenue ${money(m.revenue)}/day · demand ${m.demand.toFixed(0)} · directive holds: ${directive.label}.`,
    });
  }

  return { events, directive };
}

/** Rule-based board decision: address the org's biggest problem first. */
function decideDirective(state: OrgState, R: Ruleset): DirectiveKind {
  const m = state.metrics;
  const netBurn = Math.max(0, m.expenses - m.revenue);
  const runway = netBurn > 0 ? m.cash / netBurn : Infinity;

  if (runway < R.orchestration.runwayConcernDays || m.cash < 0) return "cut-costs";
  if (m.morale < R.orchestration.moraleConcern) return "protect-people";
  if (m.techDebt > R.orchestration.techDebtConcern) return "invest-rnd";
  if (m.demand > 60 && m.growth > 0) return "seize-market";
  return "steady";
}

/** How a standing directive biases the org's focus pushes each tick. */
export function directiveBias(
  kind: DirectiveKind,
  strength: number,
): Partial<Record<"innovation" | "efficiency" | "people" | "growth", number>> {
  switch (kind) {
    case "cut-costs":
      return { efficiency: strength };
    case "invest-rnd":
      return { innovation: strength };
    case "seize-market":
      return { growth: strength };
    case "protect-people":
      return { people: strength };
    default:
      return {};
  }
}

function money(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}K`;
  return `${s}$${Math.round(a)}`;
}
function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}
