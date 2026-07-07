/**
 * The engine boundary.
 *
 * The frontend talks to the simulation ONLY through this interface — never by
 * importing engine internals directly into components. That single rule is what
 * keeps the door open to a future Python/FastAPI engine: swapping the V1
 * in-process implementation for a remote one is a new class behind the same
 * interface, with zero component changes. (See vault/adr/0001.)
 *
 * V1  →  LocalEngineClient   — runs @athena/engine in-process (this file).
 * V2  →  RemoteEngineClient   — fetch/SSE to a FastAPI service (not yet built).
 * V1.5 → WorkerEngineClient   — same engine, off the main thread (Phase 1).
 */

import {
  advance,
  advanceBy,
  createOrganization,
  type OrgState,
  type SimConfig,
  type TickResult,
} from "@athena/engine";

export interface EngineClient {
  /** Birth a new organization from a configuration. */
  create(config: SimConfig): OrgState;
  /** Advance one tick (one business day). Pure: returns the next state + events. */
  tick(state: OrgState): TickResult;
  /** Advance many ticks at once (fast-forward). */
  tickMany(state: OrgState, count: number): TickResult;
}

/** V1: the engine runs in the browser, in-process. No network, no cost. */
export class LocalEngineClient implements EngineClient {
  create(config: SimConfig): OrgState {
    return createOrganization(config);
  }
  tick(state: OrgState): TickResult {
    return advance(state);
  }
  tickMany(state: OrgState, count: number): TickResult {
    return advanceBy(state, count);
  }
}

/** The single place the app picks its engine transport. */
export const engine: EngineClient = new LocalEngineClient();
