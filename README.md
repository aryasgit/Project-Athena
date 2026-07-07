# Project Athena

**An Enterprise Organizational Digital Twin — a living systems simulation.**

Athena is not a dashboard. You create a company, press **Start**, and watch an
organization *live*: time advances in ticks, departments and markets interact,
decisions accumulate, and consequences emerge. It exists to explore one question —
**how do organizations evolve as thousands of interconnected decisions accumulate
over time?** Think SimCity or Football Manager, not Power BI.

Part of **The Living Systems Initiative** (with Project Vega — financial decisions,
and Project Agora — market execution).

## Principles

- **Deterministic first.** The simulation is the intelligence. Same seed ⇒ the same
  history, forever — reproducible and explainable.
- **AI-optional.** Remove every AI module and Athena is still complete. No API keys,
  no cloud inference, no recurring cost required. AI may later *explain* the world; it
  never *drives* it.
- **Emergence over scripting.** Complex behaviour arises from many simple agents.

## Stack

| Layer | Tech |
|---|---|
| Frontend | TypeScript · Next.js 15 · React 19 · Framer Motion · D3 (· React Flow, Phase 1) |
| Engine | `@athena/engine` — pure TypeScript, deterministic, seeded, serializable |
| Boundary | `EngineClient` — swap in-process → Python/FastAPI later with no UI change |

The engine runs **in the browser** in V1 (in-process, zero cost). The `EngineClient`
seam keeps a Python extraction one class away — see
[`vault/adr/0001`](vault/adr/0001-typescript-engine.md).

## Quick start

```bash
npm install
npm run dev            # → http://localhost:3000  (the Observatory boots alive)
npm run engine:test    # prove determinism (same seed ⇒ identical history)
```

## Layout

```
packages/engine/   the deterministic simulation core (pure TS)
web/               the Next.js observatory
vault/             the knowledge base — start at vault/README.md
_archive/          the deprecated Decision-Intelligence dashboard (frozen)
```

## Documentation

The **[Vault](vault/README.md)** is the project's long-term memory: topology,
architecture, engine design, roadmap, glossary, and decision records. It's written to
be read by someone who has never seen the code.
