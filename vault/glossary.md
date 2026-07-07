# Glossary

Plain-language definitions. Technical terms get an everyday explanation too.

- **Organizational Digital Twin** — a simulated company that lives and evolves on
  its own. Not a copy of a real company and not a forecast; a *plausible* company you
  can create, watch, and experiment with.
- **Tick** — one step of simulated time. In V1, one tick = one business day. The
  world advances one tick at a time.
- **OrgState** — the single object that *is* the organization at a moment in time:
  its date, its metrics, its agents, its recent events. Plain data (JSON-safe).
- **advance()** — the function that moves the world forward exactly one tick.
  `advance(state) → { next state, events that happened }`. It is *pure*: same input
  always gives the same output.
- **Deterministic** — no hidden luck. Given the same starting seed, the world unfolds
  identically every single time, so behaviour can be studied and replayed.
- **Seed** — the number that fixes the world's "dice." Same seed ⇒ same history.
- **PRNG** — pseudo-random number generator. Produces numbers that *look* random but
  come from the seed, so they're reproducible. (Athena uses mulberry32.)
- **Agent** — an actor inside the org with its own internal state: a department,
  employee, project, executive, customer, or market. Big behaviour emerges from many
  small agents interacting.
- **Emergence** — complex, lifelike behaviour arising from many simple interactions
  rather than from one big rulebook. The opposite of scripted.
- **Metrics / vital signs** — the org's numbers: cash, revenue, morale, demand,
  innovation, tech debt, reputation, risk, and so on. No single one defines success.
- **Runway** — how many days the org can survive at its current burn rate
  (cash ÷ daily expenses). Low runway is dangerous.
- **Tech debt** — the accumulated cost of shortcuts. Higher is worse; it quietly
  erodes customer satisfaction over time.
- **Event** — a narrated thing that happened this tick (a warning, a milestone, a
  world event). How the simulation tells its story.
- **EngineClient** — the *only* doorway between the frontend and the simulation.
  Lets us later move the engine to another language/service without touching the UI.
- **The three-layer law** — Simulation (mandatory) → Orchestration (mandatory) → AI
  (optional). Lower layers never depend on higher ones.
- **Observatory** — the main screen: where you watch the living organization.
- **Vault** — this knowledge base. The project's long-term memory.
