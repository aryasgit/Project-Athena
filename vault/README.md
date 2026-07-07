# The Athena Vault

This is the long-term memory of Project Athena. It exists so that someone who has
never seen the code can understand **what Athena is, why it is built the way it is,
and what was tried and rejected along the way.** Where the code says *how*, the vault
says *why*.

Rule of the vault: **clarity over jargon.** Every hard idea gets an intuitive
explanation next to the technical one. If a newcomer can't follow it, it isn't done.

## What Athena is, in one paragraph

Athena is an **Enterprise Organizational Digital Twin** — a living simulation of a
company. You create an organization (industry, capital, philosophy, size, risk
appetite), press **Start**, and then watch it *live*: time advances in ticks,
departments and employees and projects and markets interact, decisions accumulate,
and consequences emerge. It is not a dashboard and not a predictor. It is a SimCity
for organizations, built to explore one question: **how do organizations evolve as
thousands of interconnected decisions accumulate over time?**

## How to read this vault

| Doc | What it answers |
|---|---|
| [00-topology.md](00-topology.md) | The whole system on one screen (ASCII map). |
| [01-architecture.md](01-architecture.md) | The three-layer law, the monorepo, and how it deploys. |
| [02-engine-design.md](02-engine-design.md) | How the deterministic core actually works. |
| [roadmap.md](roadmap.md) | The phases: what's built, what's next. |
| [glossary.md](glossary.md) | Plain-language definitions of every term. |
| [adr/](adr/) | Architecture Decision Records — the forks in the road and why we chose. |

## The laws Athena is built on

1. **Deterministic first.** The simulation is the intelligence. Same seed ⇒ same
   history, forever. Everything must be explainable and reproducible.
2. **AI is optional, never required.** Remove every AI module and Athena is still a
   complete product. AI may later *explain* the simulation; it may never *drive* it.
3. **Nothing outside the Organization Engine mutates organizational state.**
4. **Emergence over scripting.** Complex behaviour should arise from many simple
   interacting agents — not from hardcoded scenarios.
5. **Always demonstrable.** Every phase ends with something you can watch move.
