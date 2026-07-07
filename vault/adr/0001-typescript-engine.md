# ADR 0001 — The engine is TypeScript now, Python-extractable later

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Project lead + Claude

## Context

The Organization Engine is Athena's deterministic core and will grow heavy. Two
credible options were on the table:

1. **TypeScript engine, in-process** with the Next.js frontend.
2. **Python / FastAPI engine** as a separate service from day one.

Python is attractive for a *heavy* simulation (NumPy, SciPy, Mesa, ML). But the
decisive constraint is different: **the user only ever experiences the frontend, and
frontend polish requires a tight iteration loop.** A day-one Python service adds a
second deploy target, a network boundary, CORS, cold starts, and serialization —
taxing the exact loop (tweak a rule → watch it move on screen) that produces polish.

## Decision

Write the engine in **TypeScript now**, as a pure package (`@athena/engine`) that
the frontend runs **in-process**. Isolate it behind a single boundary —
`web/lib/engine-client.ts` (`EngineClient`) — so a later Python/FastAPI engine is a
new implementation behind the same interface, not an architectural change.

Keep the engine **portable in shape**, which the deterministic model already forces
for free: `advance(state) → { state, events }` with plain-data, serializable state
in and out, no hidden I/O. That contract is language-agnostic; porting it later is a
rewrite of the *body*, never the *architecture*.

## Consequences

**Good:** one repo, one language, one deploy; no network boundary; 60fps motion off
in-memory state; determinism trivially provable in-process; zero recurring cost; all
effort goes to the visible product.

**Cost / risk:** heavy CPU-bound math later may strain a single browser thread.
Mitigations, in order: (1) run the engine in a **Web Worker** (Phase 1.5, no API
change); (2) extract to **Python/FastAPI** behind `RemoteEngineClient`.

## When to revisit (concrete triggers)

Flip to Python when **any** hold:
- A single tick exceeds ~16 ms even in a Worker **and** it's CPU-bound math NumPy
  would vectorize.
- We need Python-only libraries (Mesa, SciPy optimization, ML) with no good JS peer.
- Worlds must run headless/server-side for many concurrent users, independent of a
  browser tab.

None are true at Phase 1. The `RemoteEngineClient` seam is already in place for the
day one becomes true.

## Rejected alternative

**Pre-building the microservice seam** (DTOs, HTTP-shaped API, async everywhere)
before it's needed. This pays the microservice tax without the microservice and
tends to produce worse code. The engine does not need to be Python-*ready*; it needs
to be portable in shape, which it is.
