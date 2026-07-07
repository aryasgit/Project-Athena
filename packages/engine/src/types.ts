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

export interface DepartmentState {
  id: string;
  kind: DepartmentKind;
  headcount: number;
  budget: number;
  effectiveness: number; // 0..100
}

/** Phase 1 populates employees, projects, executives, customers, market. */
export interface AgentPools {
  departments: DepartmentState[];
}

// ── Events (what the world narrates) ────────────────────────────────────────

export type EventSeverity = "info" | "good" | "warn" | "critical";
export type EventKind =
  | "system"
  | "finance"
  | "market"
  | "people"
  | "product"
  | "world";

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
