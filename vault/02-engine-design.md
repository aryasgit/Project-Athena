# Engine Design

The Organization Engine (`@athena/engine`) is Athena's deterministic core. This
doc explains how it works and how it is meant to grow.

## The one contract

```ts
createOrganization(config: SimConfig): OrgState        // birth
advance(state: OrgState): { state: OrgState, events }   // one tick (one day)
advanceBy(state, n): { state, events }                  // fast-forward n ticks
```

Everything is **plain data**. `OrgState` is a JSON-safe object — no classes, no
methods, no functions. That is not an accident: because state is pure data, the
identical object can be advanced in-process (TypeScript) or shipped over HTTP to a
future Python engine. The contract is the boundary.

## Determinism — the non-negotiable

`advance` is a **pure function**. It contains no `Date.now()`, no `Math.random()`,
no I/O. All randomness flows from a single serialized cursor, `state.rngState`,
threaded through a seeded PRNG (mulberry32). Therefore:

> **Same seed + same config ⇒ byte-identical history, forever.**

This is proven in `packages/engine/test/engine.test.ts` (a 365-day run twice yields
`deepEqual` states). *Intuition: the world is a deterministic machine; the seed is
the crank. Turn it the same way and you get the same movie, frame for frame — which
is what makes emergent behaviour something you can study rather than just watch.*

## What a tick does today (Phase 0)

One tick = one business day. `advance` evolves the org's vital signs as a small
**coupled system**, so the numbers push and pull on each other:

- **Demand** does a bounded random walk, nudged by growth strategy and reputation.
- **Revenue** = demand × workforce capacity × brand, with daily variance.
- **Expenses** = payroll (headcount × loaded cost × spend appetite) + overhead.
- **Cash** += revenue − expenses. Low **runway** raises pressure.
- **Runway pressure** drags **morale** down and pushes **risk** up.
- **Innovation** vs accumulating **tech debt** drives **customer satisfaction**,
  which slowly moves **reputation**, which feeds back into demand.
- The world emits **events** on threshold crossings (runway < 30 days, morale < 40,
  demand surge) plus a periodic **world event** (competitor, regulation, tailwind).

No single number defines success — the interesting behaviour is in the couplings.

## How it grows (Phase 1 →)

Today the headline metrics are computed *directly*. The plan is to make them
**emergent** by routing every transition through the agent pools:

```
OrgState.agents = {
  departments[],   // ← Phase 0: seeded
  employees[],     // ← Phase 1
  projects[],      // ← Phase 1
  executives[],    // ← Phase 1
  customers[],     // ← Phase 2
  market            // ← Phase 2
}
```

Each agent owns internal state and makes small local decisions each tick; the
headline metrics become *aggregations of agent behaviour* rather than formulas. Same
contract, richer interior. The engine's public surface does not change — only its
insides — which is exactly why the boundary is kept narrow.

## Files

| File | Responsibility |
|---|---|
| `src/types.ts` | The plain-data contract: `SimConfig`, `Metrics`, `OrgState`, `OrgEvent`. |
| `src/state.ts` | `createOrganization` — config → living day-0 state. |
| `src/core/engine.ts` | `advance` / `advanceBy` — the deterministic tick. |
| `src/core/rng.ts` | Seeded, serializable PRNG. |
| `src/core/clock.ts` | Tick ↔ calendar-day mapping. |
| `src/index.ts` | The narrow public surface the frontend imports. |
