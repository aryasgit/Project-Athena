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

## ◑ Phase 2 — Orchestration & World (mostly done)

- ✅ **External world:** a multi-year economic cycle, sector sentiment, rising
  regulation, supply shocks and competitors, all evolving each tick and modulating
  demand, revenue, costs and risk (`core/world.ts`). Surfaced in a World view.
- ✅ **Level-2 orchestration:** a deterministic scheduler holds quarterly board
  reviews and monthly reviews that read the org's condition and set a standing
  **directive** (cut costs / invest in R&D / seize market / protect people), which
  biases the org so it visibly self-corrects (`core/orchestration.ts`). No LLM.
- ⏸ **n8n adapter** — design-first per the initiative's standing rule; not auto-built.
  The scheduler is deliberately modular so n8n could later drive the same cadences.

## ✅ Fidelity & Customization (research-grade pass)

Elevated from a coherent toy to a research instrument.

- **Ruleset** (`packages/engine/src/ruleset.ts`): every governing coefficient is
  now explicit, tunable data on the config — a run is defined by (seed + ruleset).
- **Event & disaster engine** (`core/events.ts`): ~16 data-driven situations across
  internal / market / macro / black-swan classes with state-dependent triggers,
  cooldowns and effects. Runs diverge into genuinely different, consequential
  histories (orgs can and do go insolvent).
- **Executive personas** (`data/personas.ts`): archetypes with five traits, bios and
  succession. The board's personality mix steers the org.
- **Research framing**: scenario library + Advanced parameter editor + scenario
  file import/export in `/create`; run timeseries CSV export in the Observatory.

## ✅ Instrumentation pass (de-gamification)

- **Telemetry timeline** — four synchronized panels (treasury / flows / vitals /
  macro), full 16-field per-tick history, event markers pinned to their day,
  critical events cutting through all panels, crosshair readout.
- **Event library** (`core/events.ts`) — ~45 concrete events across people,
  product, market, finance, world and disaster domains, generated against live
  state (named poachings, named rival moves) with specific attribute effects.
- **Causal attribution** — the engine emits per-tick `drivers` (its own terms:
  revenue, payroll, macro climate, debt drag, runway pressure, events…);
  the Vitals view renders them as signed contribution bars.
- **Ghost runs** — the same company re-lived under another seed, overlaid on the
  timeline in lockstep with the live clock; divergence = the effect of chance.
- **Denser instruments** — trend sparklines in every vital cell and world stat,
  competitor aggression flags, productivity/staffing/value on the topology.

## ▢ Phase 3 — Optional AI

- `Advisor` interface with swappable providers: rule-based ▸ Ollama ▸ cloud LLM.
- Board-meeting summaries, event narration, strategy Q&A — all reading deterministic
  output, none writing state. Degrades gracefully to rule-based when AI is absent.

## ▢ Phase 4 — Depth & Portfolio

- Scenario planning / branching timelines from a snapshot.
- The umbrella vision: Vega as a Research Division, Agora as the Market.
- Deployment hardening, diagrams (state-transition, sequence), project website.
