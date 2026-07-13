/**
 * @athena/engine — the Organization Engine public surface.
 *
 * The frontend imports ONLY from here, and only ever touches:
 *   createOrganization(config) → OrgState        (birth)
 *   advance(state) → { state, events }           (one tick)
 *   advanceBy(state, n) → { state, events }       (n ticks)
 * plus the plain-data types. Keeping the surface this narrow is what lets the
 * whole engine later move behind an HTTP boundary (Python/FastAPI) without the
 * frontend noticing — see vault/adr/0001.
 */

export type {
  Tick,
  Industry,
  Philosophy,
  CompanySize,
  GrowthStrategy,
  RiskAppetite,
  DepartmentKind,
  SimConfig,
  Metrics,
  ExecRole,
  ExecutiveState,
  DepartmentState,
  EmployeeState,
  ProjectState,
  AgentPools,
  Competitor,
  WorldState,
  Directive,
  DirectiveKind,
  InterventionKind,
  Intervention,
  Policies,
  DecisionRecord,
  EventSeverity,
  EventKind,
  OrgEvent,
  Driver,
  OrgState,
  TickResult,
} from "./types";

export { createOrganization, clamp, effectivenessOf } from "./state";
export { DEFAULT_RULESET, resolveRuleset } from "./ruleset";
export type { Ruleset, DeepPartial } from "./ruleset";
export { advance, advanceBy } from "./core/engine";
export { applyIntervention, interventionLabel, INTERVENTIONS } from "./core/intervene";
export type { InterventionDef } from "./core/intervene";
export { Rng, nextFloat } from "./core/rng";
export { addDays, daysBetween, tickLabel } from "./core/clock";
