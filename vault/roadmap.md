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

## ◑ Phase 1 — The Living Core (mostly done)

Make the world creatable and the interior emergent.

- ✅ **Agent pools are real:** executives, departments, projects and a notable-people
  roster. Headline metrics are now *aggregations of agent behaviour* — projects ship
  and lift innovation/reputation/cash, stalls breed debt/risk, people are hired and
  resign, executives bias the org by focus.
- ✅ **Create-Company flow** (`/create`): name, industry, capital, philosophy, size,
  strategy, risk, departments, with a live day-0 preview and a regenerable seed.
- ✅ **Org topology** view: CEO → leadership + departments → active projects, drawn in
  bespoke SVG (React Flow's edge renderer wouldn't measure under React 19 here), live
  each tick.
- ✅ **Persistence:** worlds autosave to localStorage and resume on reload.
- ⏸ **Web Worker engine** — *deliberately deferred.* The agent tick runs well under
  16ms and motion is already smooth, so moving it off-thread would force the whole
  client to an async engine boundary for no measurable gain (and risk static-export
  friction). Per ADR 0001, we add it only when a tick actually blocks the main thread.

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
