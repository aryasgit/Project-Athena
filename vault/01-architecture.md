# Architecture

## The three-layer law

Athena is built as three stacked layers with a strict one-way dependency. Each
layer may read the one above it; none may reach down and drive it.

```
Level 1  DETERMINISTIC SIMULATION   (mandatory)  ← the intelligence
Level 2  WORKFLOW ORCHESTRATION     (mandatory)  ← coordination, no LLM
Level 3  AI REASONING               (optional)   ← explanation only
```

- **Level 1 — Simulation.** Pure deterministic rules. The organization evolves
  entirely through seeded, reproducible state transitions. This is where Athena's
  value lives. *Intuition: the world is a board game with fixed rules and a fixed
  dice roll — replay the same seed and you get the same game every time.*
- **Level 2 — Orchestration.** Schedules events, fans out notifications, triggers
  board meetings and reports. Coordinates subsystems. Uses **no** LLM reasoning.
  Designed to later delegate to n8n without coupling Athena to it.
- **Level 3 — AI.** *Optional.* May explain results, summarize a board meeting,
  narrate an event, answer a question. It reads Level 1's deterministic output and
  never writes state. **Remove Level 3 entirely and Athena is still complete.**

Why so strict? Because the research question — how organizations evolve through
accumulating decisions — is only meaningful if the answer is *reproducible and
explainable*. An LLM in the loop would make the world unrepeatable and unaccountable.

## The monorepo

```
Project-Athena/
├── packages/
│   └── engine/          @athena/engine — pure TS simulation core (no React/DOM/IO)
│       ├── src/
│       │   ├── types.ts     the wire-serializable contract (plain data)
│       │   ├── state.ts     createOrganization(config) → OrgState
│       │   ├── core/
│       │   │   ├── engine.ts   advance(state) → { state, events }
│       │   │   ├── rng.ts      seeded, serializable PRNG (mulberry32)
│       │   │   └── clock.ts    tick ↔ calendar day
│       │   └── index.ts     the narrow public surface
│       └── test/            determinism + lifecycle tests
├── web/                 @athena/web — Next.js 15 observatory
│   ├── lib/engine-client.ts   THE boundary (Local今→ Remote later)
│   ├── lib/useSimulation.ts   the heartbeat (play/pause/speed + history)
│   ├── components/            SimHeader · VitalSigns · EventFeed · Sparkline · …
│   └── app/                   layout · globals.css (design law) · page (observatory)
├── vault/               this knowledge base
└── _archive/            the deprecated Decision-Intelligence dashboard (frozen)
```

Workspaces (`npm workspaces`) link `@athena/engine` into `web` with no publish step.
Next transpiles the engine's TypeScript in-tree (`transpilePackages`), so V1 has no
separate build for the engine during development.

## The engine boundary (the most important seam)

The frontend imports the engine **only** through `web/lib/engine-client.ts`:

```ts
interface EngineClient {
  create(config): OrgState
  tick(state): { state, events }
  tickMany(state, n): { state, events }
}
```

Today the implementation is `LocalEngineClient` (calls `@athena/engine` in-process).
Tomorrow it can be `RemoteEngineClient` (HTTP/SSE to a FastAPI service) — a new class
behind the same interface, **zero component changes**. This is the same
"common interface, swappable provider" pattern the AI layer uses. See
[adr/0001-typescript-engine.md](adr/0001-typescript-engine.md).

## Deployment

| Piece | V1 | If the engine is extracted (V2) |
|---|---|---|
| Frontend | Vercel (static/SSR, free) | unchanged |
| Engine | in the browser (in-process) | Docker FastAPI on Fly.io / Railway free tier |
| State | in-memory + localStorage | snapshot store (SQLite/Postgres) |
| Cost | **zero recurring** | one small always-on container |

V1 ships as a single Vercel app at zero recurring cost — which is the point: the
platform must never be blocked on infrastructure or a paid API.
