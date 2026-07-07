# AI Orchestration and n8n Workflow Design

> This is a design document, deliberately. Per the project's constraint, the n8n
> workflows are taught and diagrammed here first. No workflow JSON is generated
> until the design below is reviewed. Nodes come after the diagram, never before.

## The three layers, and which one is allowed to be wrong

Athena is one platform over three independent layers. The ordering is a law, not
a preference:

1. **Deterministic Analytics** (Python, SQL, statistics). Computes the truth.
   Every KPI, forecast, and recommendation originates here. Built and tested.
2. **Workflow Orchestration** (n8n). Moves, schedules, validates, and sequences
   the work. Owns retries, human approval, and notifications. This document.
3. **AI Intelligence** (Ollama primary, provider-agnostic). Interprets and
   communicates. Built as `web/lib/ai/` and `web/lib/brief.ts`.

The rule that keeps this honest: **AI must never bypass deterministic analytics.**
A model never produces a number. It receives structured JSON that the analytics
layer already computed, and it explains it. The platform stays fully functional
with every AI provider switched off, which the Executive Brief already proves
(it renders a complete brief in "Deterministic engine" mode).

## Why n8n, and not a cron script

A shell script can chain `athena build` and an email. n8n earns its place when
the pipeline needs to be *operated*, not just run:

- **Observability**: every run is a visual execution log, per node, with the
  payload that flowed through. When a Tuesday refresh fails, you see which node.
- **Retries and error branches**: a flaky provider or a locked warehouse retries
  on that node only, and routes to a fallback (deterministic brief) on give-up.
- **Human in the loop**: a monthly board brief can pause for approval before it
  emails leadership. A script cannot wait for a person cleanly.
- **Connectors**: email, Slack, Drive, S3, PDF, schedule triggers, webhooks, all
  as nodes rather than bespoke code.
- **Modularity**: sub-workflows are reusable templates. "Run Analytics" is built
  once and called by four parent workflows.

The principle: **every workflow should solve a genuine operational problem, not
showcase AI.** If a workflow does not remove real manual toil, it should not exist.

## The integration surface

n8n does not import Python. It talks to the analytics layer over a thin,
stable contract. The recommended surface is a small HTTP API in front of the
existing pipeline stages (a FastAPI wrapper over the `athena` CLI), exposing:

```
POST /ingest      {dataset_url}        -> {rows, tables}
POST /build       {module}             -> {status, cycle}
GET  /analytics   {module}             -> structured JSON (kpis, rankings, forecast)
POST /brief       {module}             -> ExecutiveBrief JSON  (deterministic; AI-enhanced if a provider is set)
GET  /health                           -> {ok}
```

Each endpoint returns structured JSON. n8n orchestrates the calls; the AI layer
sits behind `/brief` and the dashboard reads the warehouse. This keeps the
contract between layers explicit and testable in isolation.

## Reusable sub-workflow templates (build these once)

Design the small pieces first; the big workflows are compositions of them.

- **T1 · Validate Dataset**: schema check, null and type audit, row-count sanity,
  route to an error branch with a human-readable reason on failure.
- **T2 · Run Analytics**: call `/build` then `/analytics`, return the JSON.
- **T3 · Generate Brief**: call `/brief`, receive the ExecutiveBrief JSON.
- **T4 · Render Report**: JSON to PDF/HTML (board-ready), store the artifact.
- **T5 · Notify**: email or Slack a summary with the artifact link.

## Workflow 1 · On-demand analysis pipeline

*Problem it solves: a stakeholder drops in a new dataset and wants the full
analysis and brief without touching a terminal.*

```
 Upload / Webhook trigger
        │
        ▼
 [T1] Validate Dataset ──fail──▶ Notify uploader (reason)  ─▶ stop
        │ pass
        ▼
 [T2] Run Analytics  (/ingest ▶ /build ▶ /analytics)
        │  (structured JSON)
        ▼
 [T3] Generate Brief (/brief)     ◀── AI layer enhances prose here, or not
        │
        ▼
 Warehouse is updated ▶ dashboard reads it live (no node needed)
        │
        ▼
 [T4] Render Report ─▶ [T5] Notify stakeholders (brief + link)
```

Why this shape: validation gates everything, so bad data never reaches the
warehouse. The AI step is a single node deep in the chain, never the source of a
figure. If `/brief` returns the deterministic brief because no provider is up,
the workflow still completes.

## Workflow 2 · Scenario simulation

*Problem it solves: a leader asks "what if we raise internship coverage to 70%"
and wants it recorded, interpreted, and circulated, not just seen on a slider.*

```
 Scenario submitted (levers)
        │
        ▼
 Recalculate projection  (deterministic scenario engine)
        │
        ▼
 Update forecast view
        │
        ▼
 AI interpretation  (Forecast Analyst persona over the projection JSON)
        │
        ▼
 Business recommendation  (verdict + confidence, from the engine)
        │
        ▼
 Dashboard refresh ─▶ Executive report updated
```

Note: the live in-app simulator (`/simulator`) already does the interactive
version instantly, client-side. This workflow is for the *recorded, circulated*
scenario: the same engine, wrapped for audit and distribution.

## Workflow 3 · Scheduled monthly executive brief

*Problem it solves: leadership expects a brief on the first of the month.
Nobody should assemble it by hand.*

```
 Cron (1st, 08:00)
        │
        ▼
 [T2] Run Analytics (refresh warehouse)
        │
        ▼
 [T3] Generate Brief
        │
        ▼
 Human approval gate  (optional pause)
        │ approved
        ▼
 [T4] Render PDF ─▶ [T5] Notify stakeholders ─▶ Archive artifact
```

Sibling schedules reuse the same templates: **Daily KPI Review** (T2 to detect
anomalies, T3 for a short AI summary, T5 to email), **Weekly Business Review**
(T2, T3, T4, archive).

## Node-level sketch (Workflow 3), for when we build

Illustrative only, to show the mapping. We implement after this design is
approved.

| Step | n8n node | Config intent |
| --- | --- | --- |
| Trigger | Schedule Trigger | cron `0 8 1 * *` |
| Refresh | HTTP Request | `POST /build {module: placement}` |
| Brief | HTTP Request | `POST /brief {module: placement}` |
| Approve | Wait / Webhook | pause for a click before sending |
| Render | HTTP Request or Function | brief JSON to PDF |
| Notify | Email / Slack | attach PDF, summary in body |
| Archive | S3 / Drive | store with cycle in the filename |

## The AI layer this orchestration calls

Already implemented and provider-agnostic (`web/lib/ai/provider.ts`):

- **Providers**: Ollama (primary, local), OpenRouter, OpenAI, Anthropic, Gemini.
  Selected by `AI_PROVIDER`; switching is a config change, not a code change.
- **Fail-soft**: any error or timeout returns null and the caller uses the
  deterministic path. No provider configured means the brief still ships.
- **Personas** (`web/lib/ai/personas.ts`): Executive Strategy Consultant, Data
  Analyst, Forecast Analyst, Risk Analyst, Report Writer. Each reasons over the
  structured JSON and is instructed to cite figures and never invent them.

## What is built

The design above is now implemented and wired together.

- **The API** (`api/athena_api/`): FastAPI exposing `/health`, `/build`,
  `/analytics`, `/brief`, `/ask`. It reuses the `athena` pipeline for builds and
  reads the result tables for everything else. The AI provider layer
  (`api/athena_api/ai.py`) mirrors the web one: Ollama primary, fail-soft to the
  deterministic path.
- **Natural-language query** (`api/athena_api/nl.py`): retrieves structured
  evidence first, then reasons, and always cites figures. Exposed at `/ask` and
  surfaced in the dashboard at `/ask` through a server proxy
  (`web/app/api/ask/route.ts`).
- **The workflows** (`orchestration/n8n/*.json`): importable n8n workflows for
  on-demand analysis, the monthly executive brief, and the daily KPI review.
  They call the API endpoints above. The email and Slack nodes are left as
  placeholders to wire to your own credentials.
- **The stack** (`docker-compose.yml`): Postgres, the API, n8n, and the web app,
  with an optional Ollama profile.

## Running the full stack

```bash
docker compose up -d                 # postgres + api + n8n + web
docker compose --profile ai up -d    # also start local Ollama

# seed the warehouse once
curl -X POST localhost:8099/build -H 'content-type: application/json' \
     -d '{"regenerate": true}'
```

Then: dashboard `localhost:3000`, n8n `localhost:5678`, API `localhost:8099`.
In n8n, import the files under `orchestration/n8n/`. To turn the AI layer on,
set `AI_PROVIDER` (and any key) in the environment; with it unset, every surface
still works deterministically.

## Remaining

- Domain and dataset selection with CSV upload (Layer 1).
- Guided consulting mode (Layer 8).
- Wiring the notification nodes (email, Slack) to real credentials.
