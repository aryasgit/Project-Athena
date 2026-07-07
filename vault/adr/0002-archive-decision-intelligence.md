# ADR 0002 — Archive the Decision-Intelligence dashboard; treat Athena as inception

- **Status:** Accepted
- **Date:** 2026-07-07

## Context

The previous Athena was an **Enterprise Decision Intelligence Dashboard**: SQL
analytics, BI, executive reporting, AI-generated recommendations. Technically sound,
but it violated the portfolio philosophy — Vega models financial decisions, Agora
models market execution, and Athena was becoming "another dashboard" rather than a
**living system**.

## Decision

Archive the entire prior implementation, untouched, into `_archive/` and treat this
as the true inception of Athena. Do not reuse its architecture. The one thing carried
forward is the **visual DNA** (dark Tokyo-Night-on-black tokens, Inter Tight / JetBrains
Mono typography) — identity preservation — re-expressed for a simulation, not a report.

## Consequences

- `_archive/` is frozen reference, never a dependency. Build artifacts
  (`node_modules`, `.next`) were dropped before archiving; source is intact.
- The new build is a clean monorepo (`packages/engine` + `web`) with no lineage to
  the old SQL/BI stack.

## Rejected alternative

**Incrementally refactoring the dashboard into a simulation.** Rejected: the two are
different kinds of software (a reporting surface vs. a stateful world). Refactoring
would have smuggled dashboard assumptions into a system whose whole point is that it
is *alive*.
