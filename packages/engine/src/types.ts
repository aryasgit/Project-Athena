/**
 * Athena Organization Engine — the wire-serializable contract.
 *
 * Everything in this file is plain data: JSON-safe, no methods, no class
 * instances, no functions. That is deliberate. The deterministic core is
 * `advance(state) -> { state, events }` where `state` in and out is one of
 * these objects. Because the contract is pure data, the SAME state can be
 * simulated in-process (TypeScript, V1) or shipped over HTTP to a future
 * Python/FastAPI engine (V2) without changing a single frontend type.
 *
 * DEPENDENCY LAW: nothing outside the engine may construct or mutate an
 * OrgState by hand. Create it with `createOrganization()` and move it forward
 * only through `advance()`.
 */

import type { Ruleset } from "./ruleset";

/** Discrete simulation time. One tick = one business day (V1). */
export type Tick = number;

// ── Configuration (the "Create Company" inputs) ─────────────────────────────

export type Industry =
  | "software"
  | "manufacturing"
  | "finance"
  | "retail"
  | "biotech";

export type Philosophy =
  | "innovation" // move fast, invest in R&D, tolerate tech debt
  | "efficiency" // lean, margin-focused, cautious hiring
  | "people" // morale & retention first
  | "growth"; // capture market share aggressively

export type CompanySize = "startup" | "scaleup" | "enterprise";
export type GrowthStrategy = "organic" | "aggressive" | "conservative";
export type RiskAppetite = "averse" | "balanced" | "seeking";

export type DepartmentKind =
  | "engineering"
  | "sales"
  | "marketing"
  | "operations"
  | "research"
  | "finance"
  | "people";

export interface SimConfig {
  /** Deterministic seed. Same seed + same config ⇒ byte-identical history. */
  seed: number;
  name: string;
  industry: Industry;
  /** Starting cash, in whole currency units. */
  initialCapital: number;
  philosophy: Philosophy;
  size: CompanySize;
  growthStrategy: GrowthStrategy;
  riskAppetite: RiskAppetite;
  /** Departments the org launches with. */
  departments: DepartmentKind[];
  /** Simulated calendar start, ISO date (YYYY-MM-DD). */
  startDate: string;
  /**
   * The governing coefficients. Optional in a hand-written config (defaults are
   * filled in at birth); always present on a live OrgState's config.
   */
  ruleset?: Ruleset;
}

// ── Metrics (the organization's vital signs) ────────────────────────────────

/**
 * No single KPI defines success. These co-evolve; the interesting behaviour
 * is emergent, in how they push and pull on each other over thousands of ticks.
 */
export interface Metrics {
  cash: number; // currency units on hand
  revenue: number; // revenue booked this tick
  expenses: number; // costs incurred this tick
  headcount: number; // total employees
  morale: number; // 0..100 — average employee sentiment
  demand: number; // 0..100 — market appetite for the product
  innovation: number; // 0..100 — R&D output / product edge
  techDebt: number; // 0..100 — accumulated shortcuts (higher = worse)
  reputation: number; // 0..100 — brand standing
  customerSat: number; // 0..100 — customer satisfaction
  risk: number; // 0..100 — exposure (higher = more fragile)
  growth: number; // signed % — headline momentum
}

// ── Agents (own their own internal state) ───────────────────────────────────
//
// The headline Metrics are no longer computed by formula — they EMERGE from
// these agents interacting each tick. Departments turn headcount + morale into
// effectiveness; projects consume that effectiveness and, when they ship, lift
// innovation/revenue/reputation; executives bias the whole org; notable people
// give the workforce a face and drive hiring/attrition texture.

export type ExecRole = "CEO" | "CFO" | "CTO" | "COO" | "CMO";

export interface ExecutiveState {
  id: string;
  name: string;
  role: ExecRole;
  /** what this leader pushes the org toward */
  focus: "innovation" | "efficiency" | "people" | "growth";
  influence: number; // 0..100 — how strongly their focus biases the org
  confidence: number; // 0..100 — moves with company performance
}

export interface DepartmentState {
  id: string;
  kind: DepartmentKind;
  name: string;
  headcount: number;
  budget: number;
  morale: number; // 0..100 — aggregate of its people
  productivity: number; // 0..100 — output per head, moves with morale & debt
  effectiveness: number; // 0..100 — headcount × productivity, the dept's "power"
  /** ids of the notable employees materialised for this dept */
  leadIds: string[];
}

/** A discrete, bounded roster of notable people (leads, key hires). */
export interface EmployeeState {
  id: string;
  name: string;
  deptId: string;
  role: string;
  seniority: "junior" | "mid" | "senior" | "lead";
  morale: number; // 0..100
  skill: number; // 0..100
  tenure: number; // days at the company
  status: "active" | "left";
}

export interface ProjectState {
  id: string;
  name: string;
  deptId: string;
  progress: number; // 0..100
  complexity: number; // 0..100 — bigger = slower, riskier, more valuable
  value: number; // currency unlocked / recognised on ship
  staffing: number; // heads assigned
  status: "active" | "shipped" | "stalled";
  daysActive: number;
}

export interface AgentPools {
  executives: ExecutiveState[];
  departments: DepartmentState[];
  employees: EmployeeState[];
  projects: ProjectState[];
  /** monotonic counter so freshly-spawned agents get stable unique ids */
  nextId: number;
}

// ── The external world (the environment the org lives inside) ───────────────
//
// The organization does not evolve in a vacuum. A living economy, competitors,
// regulators and supply conditions press on it every tick — modulating demand,
// costs and risk. This is Phase 2's "world" half; deterministic like everything.

export interface Competitor {
  id: string;
  name: string;
  strength: number; // 0..100 — market muscle
  aggression: number; // 0..100 — how often they make a move
}

export interface WorldState {
  economy: number; // -100..100 — boom(+) / recession(−), a slow multi-year cycle
  economyPhase: number; // internal cursor for the cycle (radians)
  sentiment: number; // 0..100 — sector optimism
  regulation: number; // 0..100 — compliance burden
  supply: number; // 0..100 — supply-chain health (100 = smooth)
  competitors: Competitor[];
}

/** A standing directive set by the board that biases the org until superseded. */
export type DirectiveKind = "cut-costs" | "invest-rnd" | "seize-market" | "protect-people" | "steady";

export interface Directive {
  kind: DirectiveKind;
  label: string;
  sinceDay: Tick;
}

// ── Events (what the world narrates) ────────────────────────────────────────

export type EventSeverity = "info" | "good" | "warn" | "critical";
export type EventKind =
  | "system"
  | "finance"
  | "market"
  | "people"
  | "product"
  | "world"
  | "board";

export interface OrgEvent {
  day: Tick;
  date: string;
  kind: EventKind;
  severity: EventSeverity;
  title: string;
  detail: string;
}

// ── The single source of truth ──────────────────────────────────────────────

export interface OrgState {
  /** Schema version, so persisted worlds can be migrated forward. */
  version: 1;
  config: SimConfig;
  day: Tick; // ticks elapsed since inception (0 at birth)
  date: string; // simulated calendar date, ISO
  /** Serialized PRNG cursor. Advancing the world advances this. */
  rngState: number;
  metrics: Metrics;
  agents: AgentPools;
  /** The external environment the org lives inside. */
  world: WorldState;
  /** The board's standing directive, biasing the org until superseded. */
  directive: Directive;
  /** Day each registry event last fired, for cooldowns. */
  cooldowns: Record<string, number>;
  /** Rolling window of the most recent events (bounded). */
  log: OrgEvent[];
  /** Lifecycle. A world keeps existing until paused or terminated. */
  status: "alive" | "paused" | "terminated";
}

/** The pure result of advancing the world by one tick. */
export interface TickResult {
  state: OrgState;
  events: OrgEvent[];
}
