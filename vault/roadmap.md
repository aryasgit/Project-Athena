# Roadmap

Each phase ends in something demonstrable and deployable. Future phases extend
existing systems; they don't replace them.

## ✅ Phase 0 — Inception (done)

The foundation and a living heartbeat.

- Archived the deprecated dashboard to `_archive/` (ADR 0002).
- Scaffolded the monorepo: `@athena/engine` (pure TS) + `web` (Next.js 15).
- Built the deterministic core: `createOrganization` + `advance`, seeded and
  serializable, with a coupled vital-signs model and a world-event system.
- Proved determinism with tests (same seed ⇒ byte-identical 365-day history).
- Established the `EngineClient` boundary (ADR 0001).
- Built the **Observatory**: a live cyberpunk screen where a default org ticks —
  animated vitals (Framer Motion), cash/revenue/expenses sparklines (D3), a
  streaming world feed, and transport controls (run/pause/step/speed/reset).
- Stood up this vault.

**Demo:** `npm run dev` → the organization is alive and evolving on load.

## ▢ Phase 1 — The Living Core

Make the world creatable and the interior emergent.

- **Create Company** flow (industry, capital, philosophy, size, strategy, risk,
  departments) → feeds `SimConfig`.
- **Agent pools become real:** employees, projects, executives — headline metrics
  become *aggregations of agent behaviour*, not formulas.
- **Org topology** view with **React Flow** (departments → teams → projects).
- Move the engine into a **Web Worker** (`WorkerEngineClient`) for buttery motion.
- Persist worlds to **localStorage/IndexedDB**; resume on reload.

## ▢ Phase 2 — Orchestration & World

- Level 2 workflow layer: scheduler, board meetings, notifications, reports.
- Richer external world: economy, competitors, regulation, supply chains.
- Optional **n8n** adapter (teach/design-first; never auto-built).

## ▢ Phase 3 — Optional AI

- `Advisor` interface with swappable providers: rule-based ▸ Ollama ▸ cloud LLM.
- Board-meeting summaries, event narration, strategy Q&A — all reading deterministic
  output, none writing state. Degrades gracefully to rule-based when AI is absent.

## ▢ Phase 4 — Depth & Portfolio

- Scenario planning / branching timelines from a snapshot.
- The umbrella vision: Vega as a Research Division, Agora as the Market.
- Deployment hardening, diagrams (state-transition, sequence), project website.
