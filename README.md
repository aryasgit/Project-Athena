# Project Athena — Enterprise Decision Intelligence Platform

Athena turns fragmented organizational data into **strategic recommendations**, not just charts.
Most BI tools stop at *"what happened?"* Athena is built to answer *"what should we do next?"*

It is the third and culminating system in the **Decision Intelligence Initiative** — a
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
dataset-agnostic — swapping in retail, HR, or customer data reuses the same pipeline.

```
Raw data → ETL → Postgres star schema → Analytics → Forecasting → Recommendations → Dashboard
```

Every dashboard view ends with the consulting triad:

> **Observations · Business Impact · Recommended Actions**

## Architecture

- **`pipeline/`** — Python engine: generate → ingest (ETL) → warehouse (star schema) →
  analytics → forecast → recommend. Writes computed KPIs and recommendations back into
  Postgres result tables.
- **Postgres / Supabase** — the warehouse and the computed-results store. Portable: point
  `DATABASE_URL` at a local Postgres or a Supabase project.
- **`web/`** — Next.js executive dashboard (Vercel-deployable) reading directly from Postgres.

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

- [`docs/architecture.md`](docs/architecture.md) — pipeline and data model
- [`docs/decision-framework.md`](docs/decision-framework.md) — how observations become recommendations
