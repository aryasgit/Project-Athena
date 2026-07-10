# Project Athena — Handoff & Overview

**An Enterprise Organizational Digital Twin — a deterministic, in-browser simulation of a company's life.**
Live: **https://athena-twin.vercel.app** · Repo: `aryasgit/Project-Athena`

---

## 1. What this project is

Athena is not a dashboard and not a CRUD app. It is a **living-systems simulation**: you
create a company, press start, and watch an organization evolve on its own through
thousands of interacting decisions. Departments hire and ship, executives with distinct
personalities steer the org, projects progress or stall, competitors attack, the economy
booms and busts, disasters strike — and the headline metrics (cash, morale, demand,
innovation, tech debt, reputation, risk) **emerge** from all of it rather than being
scripted.

It exists to explore one research question: **how do organizations evolve as thousands of
interconnected decisions accumulate over time?** It doesn't predict reality; it simulates
*plausible* organizational behaviour under uncertainty — closer to SimCity or Football
Manager than to Power BI.

Part of **The Living Systems Initiative** (with Project Agora — market execution, and
Project Vega — financial decisions).

### The three defining properties
1. **Deterministic.** A run is fully defined by `(seed + ruleset)`. The same inputs always
   produce the byte-identical history — proven by tests. This is what makes it a research
   *instrument* you can experiment with and reproduce, not just watch.
2. **Emergent.** No headline metric is a formula; each is an aggregation of agent behaviour.
3. **AI-optional by design.** There is zero AI in the product today, and by architecture it
   never needs any — no API keys, no cloud inference, no recurring cost.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript 5.7 (strict), end to end |
| **Simulation engine** | `@athena/engine` — a pure, dependency-free TS package (no React, no DOM, no I/O) |
| **Frontend** | Next.js 15 (App Router) · React 19 |
| **Styling** | Tailwind CSS v4 (CSS-first) · custom design system |
| **Data-viz** | D3 (`d3-scale`, `d3-shape`) — bespoke SVG charts, no chart lib |
| **3D / WebGL** | Three.js — cursor-reactive shader point-cloud background |
| **Motion** | Framer Motion · Lenis (smooth scroll) |
| **Graph** | Hand-built SVG org topology (React Flow was removed — see ADR/notes) |
| **Build / deploy** | npm workspaces monorepo · static export (`output: export`) · Vercel |
| **Tests** | `node:test` + `tsx` — determinism & lifecycle suites (9/9 green) |

**Zero runtime backend.** The engine runs in the browser; the whole thing ships as a static
site. No database, no server, no keys, no recurring cost.

### Repository shape (`npm` workspaces)
```
packages/engine/          @athena/engine — the deterministic core (pure TS)
  src/
    types.ts              the wire-serializable contract (all plain data)
    ruleset.ts            every governing coefficient, as tunable data
    state.ts              createOrganization(config) → OrgState
    core/
      engine.ts           advance(state) → { state, events } — the pure tick
      world.ts            the external environment (economy, competitors, supply…)
      orchestration.ts    Level-2 scheduler: board reviews, directives
      events.ts           ~45-event data-driven registry across 6 domains
      rng.ts              seeded, serializable PRNG (mulberry32)
      clock.ts            tick ↔ calendar day
    data/
      names.ts            deterministic name pools
      personas.ts         executive archetypes + traits
  test/                   determinism + lifecycle tests

web/                      @athena/web — the Next.js observatory (static export)
  app/         page(landing) · start(tutorial) · create(console) · observatory
  components/  Timeline · OrgTopology · WorldPanel · VitalSigns · DriversPanel · …
  lib/         useSimulation · engine-client · world · scenarios · format

vault/                    the knowledge base (this doc, architecture, ADRs, roadmap…)
_archive/                 the deprecated v1 (BI dashboard), frozen
```

~6,300 lines of TS/TSX. 54 commits.

---

## 3. Architecture — the three-layer law

A strict one-way dependency; each layer may read the one above, never drive it.

```
Level 1  DETERMINISTIC SIMULATION   (mandatory)  ← the intelligence
Level 2  WORKFLOW ORCHESTRATION     (mandatory)  ← board cadence, no LLM
Level 3  AI REASONING               (optional)   ← not built; never required
```

The frontend touches the engine **only** through one interface — `web/lib/engine-client.ts`
(`EngineClient`). Today it runs the engine in-process (`LocalEngineClient`); because the
contract is pure serializable data (`advance(state) → { state, events }`), swapping to a
remote Python/FastAPI engine later would be one new class, zero component changes. That door
is deliberately kept open (ADR 0001).

---

## 4. Capabilities (current)

### Simulation engine
- **Deterministic tick loop** — 1 tick = 1 business day; seeded, serializable, reproducible.
- **Agent model** — executives (with personas), departments, projects, and a roster of
  notable employees. Headline metrics are aggregations of their behaviour.
- **Executive personas** — 8 archetypes (Visionary, Operator, Rainmaker, Steward, Guardian,
  Closer, Technologist, Diplomat) with 5 traits each (risk, decisiveness, temperament,
  loyalty, ego), bios, and **succession** (a disheartened leader can step down and be replaced).
- **External world** — a multi-year economic cycle, sector sentiment, rising regulation,
  supply shocks, and named competitors with strength + aggression, all pressing on the org.
- **Level-2 orchestration** — scheduled quarterly board reviews + monthly reviews that read
  the org's condition and set a standing **directive** (cut costs / invest in R&D / seize
  market / protect people), so the org visibly self-corrects. No LLM; fully deterministic.
- **Event & disaster engine** — a **~45-event data-driven registry** across six domains
  (people, product, market, finance, world, black-swan disasters). Each has state-dependent
  trigger odds, a cooldown, and specific attribute effects; details are generated against
  live state (a *named* employee is poached by a *named* rival). Disasters are toggleable.
- **Causal attribution** — the engine emits a per-tick `drivers` record: its own terms
  (revenue, payroll, macro climate, debt drag, runway pressure, events…) for exactly what
  moved each metric — enabling honest "why did this move?" decomposition.

### Full customization (research-grade)
- **The Ruleset** — every governing coefficient (economy amplitude/volatility, unit
  economics, hiring/attrition, project mechanics, risk weights, competitor counts, board
  cadence, event frequency…) is explicit, tunable data. A run = `seed + ruleset`.
- **Advanced parameter editor** — ~28 live knobs, each with a plain-language helper, unit,
  default marker, and per-field reset; custom HUD sliders.
- **Scenario library** — Recession Stress Test, Hypergrowth, Cutthroat Market, Heavily
  Regulated, Calm Waters (each a ruleset preset).
- **Scenario file import/export** — save/share/reload the full experiment as JSON.

### Visualization & analysis (the instrument)
- **Telemetry timeline** — four synchronized panels (treasury, flows, 0–100 vitals, macro
  economy) over the full 16-field-per-tick history; **event markers pinned to the day they
  fired**; critical events cut dashed lines through every panel; a **crosshair** reads out
  every series at any day.
- **Ghost-run comparison** — overlay the *same company re-lived under a different seed*,
  computed headlessly in lockstep with the live clock; the divergence between the two lines
  is exactly the effect of chance.
- **Org topology** — a live graph (CEO → leadership + departments → active projects) with
  morale/productivity/effectiveness bars, shipped counts, and per-project staffing/value.
- **Vital signs** — each cell carries a trend sparkline + explanation; a **Drivers panel**
  renders the attribution as signed contribution bars.
- **World view** — economy cycle chart, sentiment/regulation/supply trends, competitors
  flagged HOSTILE/DORMANT.
- **Colour-coded event feed** — good = green, bad = red, neutral = white.
- **Run data export** — the full timeseries as CSV (a reproducible experiment record).

### Experience & persistence
- **Guided tutorial** — a 6-step cinematic HUD onboarding from the landing CTA.
- **Create-Company console** — industry, capital, philosophy, size, strategy, risk,
  departments, with a live day-0 preview + regenerable seed.
- **Persistence** — worlds autosave to localStorage and resume on reload.

---

## 5. The four surfaces
- `/` — brutalist landing (WebGL topology, decode-in headings, scroll reveals).
- `/start` — the guided intro tutorial → leads into Create.
- `/create` — the configuration console + scenario library + advanced ruleset editor.
- `/observatory` — the live simulation: Timeline · Vital Signs (+ Drivers) · Org Topology · World.

---

## 6. Design system — "Signal Over Noise"
Monotone cyberpunk HUD. Near-black void (`#050505`), a single accent — Electric Crimson
(`#FF003C`) used only for interactive + critical states — with one signal-green added for
"good" event valence. Display type is Space Grotesk (stretched, brutalist); data/labels are
JetBrains Mono; prose is Inter. Motion is state-first with full reduced-motion fallbacks.
Full spec in `web/PRODUCT.md`.

---

## 7. Run it
```bash
npm install
npm run dev            # → http://localhost:3000
npm run engine:test    # prove determinism (same seed ⇒ identical history)
npm run build          # static export to web/out
```
Deploy: static export served from repo root on Vercel (`framework: null`, `outputDirectory:
web/out`, clean URLs). One command: `vercel deploy --prod`.

---

## 8. Deliberately deferred (with rationale)
- **Web Worker engine** — the tick runs well under 16ms; off-threading adds an async boundary
  for no measurable gain until it doesn't (ADR 0001's trigger).
- **Python/FastAPI engine** — the `EngineClient` seam is ready; only worth it if simulation
  weight demands NumPy/Mesa-class tooling.
- **n8n adapter** — orchestration is modular and n8n-ready by design, but not auto-built.
- **AI layer (Level 3)** — intentionally absent; the platform is complete without it.

## 9. Natural next steps
- Scenario comparison (same seed, different ruleset) alongside seed-based ghost runs.
- Click a timeline marker → jump to its feed entry.
- Starting-condition parameters (headcount, starting morale/debt) into the ruleset.
- Default-calibration sweep (outcome distributions per scenario) for extra credibility.

---

*This document is the current-state overview. For the "why" behind decisions see
`vault/adr/`, the architecture in `vault/01-architecture.md`, the engine in
`vault/02-engine-design.md`, and progress in `vault/roadmap.md`.*
