# Project Athena: Enterprise Decision Intelligence Platform

**Live: https://web-jet-seven-49.vercel.app**

Athena turns fragmented organizational data into **strategic recommendations**, not just charts.
Most BI tools stop at *"what happened?"* Athena is built to answer *"what should we do next?"*

The live deploy runs from a committed data snapshot, so the dashboard, the What-If
Simulator, the guided consulting walkthrough, and the executive brief all work with no
database. Point `DATABASE_URL` at Postgres (or Supabase) to run live off the warehouse,
and stand up the orchestration API for live rebuilds and the natural-language Ask console.

It is the third and culminating system in the **Decision Intelligence Initiative**, a
portfolio exploring how complex decisions are made, executed, and optimized across markets
and enterprises.

| System | Layer | Question it answers |
| --- | --- | --- |
| **Agora** | Execution Intelligence | How do markets execute decisions? |
| **Vega** | Quantitative Decision Intelligence | How do we make better financial decisions? |
| **Athena** | Enterprise Decision Intelligence | How should organizations decide what to do next? |

---

## What this build does

The first vertical slice runs end-to-end on a **Placement Intelligence** dataset (hiring
trends, salary analytics, skill demand, university comparisons). The analytics engine is
dataset-agnostic. Swapping in retail, HR, or customer data reuses the same pipeline.

```
Raw data → ETL → Postgres star schema → Analytics → Forecasting → Recommendations → Dashboard
```

Every dashboard view ends with the consulting triad:

> **Observations · Business Impact · Recommended Actions**

## Architecture

Three independent layers. The ordering is a law: AI never computes a number, it
only interprets the deterministic output, and the platform works fully with
every AI provider off.

- **`pipeline/`**: deterministic analytics (Python). generate → ingest (ETL) →
  star-schema warehouse → analytics → forecast → recommend. Writes computed KPIs
  and recommendations into Postgres result tables. This is the source of truth.
- **`api/`**: the orchestration contract (FastAPI): `/build`, `/analytics`,
  `/brief`, `/ask`. Reuses the pipeline and reads the warehouse. Hosts the
  provider-agnostic AI layer (Ollama primary; OpenRouter / OpenAI / Anthropic /
  Gemini) and the natural-language query engine (evidence-first, cited).
- **`orchestration/n8n/`**: importable n8n workflows (on-demand analysis,
  monthly brief, daily KPI review) that call the API. See
  [`docs/ai-orchestration.md`](docs/ai-orchestration.md).
- **Postgres / Supabase**: the warehouse and computed-results store. Portable.
- **`web/`**: Next.js dashboard (Vercel-deployable). Reads Postgres directly for
  the analytics views and the deterministic Executive Brief; interactive
  What-If **Simulator** and natural-language **Ask** console on top.

Run the whole stack locally with `docker compose up -d` (see the orchestration doc).

## Stack

| Concern | Choice |
| --- | --- |
| Warehouse | PostgreSQL (Supabase-portable) |
| Analytics engine | Python 3.12+, pandas, statsmodels |
| Dashboard | Next.js (App Router), TypeScript, Tailwind |
| Deploy | Vercel (web) + Supabase (data) |

## Quickstart

```bash
# 1. Data pipeline
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -e .
export DATABASE_URL=postgresql://localhost:5432/athena
athena generate      # synthesize the placement dataset
athena build         # ETL → star schema → analytics → forecast → recommend

# 2. Dashboard
cd ../web
npm install
cp .env.example .env.local   # set DATABASE_URL
npm run dev
```

## Documentation

- [`docs/architecture.md`](docs/architecture.md): pipeline and data model
- [`docs/decision-framework.md`](docs/decision-framework.md): how observations become recommendations
