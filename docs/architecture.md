# Architecture

Athena is a linear decision-intelligence pipeline with a read-only dashboard on
top. Data flows one direction; each stage writes durable tables the next stage
(and the UI) reads.

```
 generate ─▶ ingest (ETL) ─▶ star schema ─▶ analytics ─▶ forecast ─▶ recommend ─▶ dashboard
   CSVs         COPY           Postgres        KPIs        Holt/OLS     triad        Next.js
```

## Data model (star schema)

The fact grain is **one placement record per student per cycle** (placed or not).

**Fact** — `fact_placement`: `is_placed`, `ctc_lpa`, `interview_rounds`,
`offers_received`, `days_to_offer`, with foreign keys to every dimension.

**Dimensions** — `dim_date` (cycle/quarter/month), `dim_university`
(tier, region), `dim_company` (sector, company tier), `dim_role`
(job family, seniority), `dim_channel` (hiring channel), `dim_student`
(degree, major, CGPA band, prior internship), `dim_skill` (category).

**Bridge** — `bridge_placement_skill` resolves the many-to-many between a
placement and its skills.

Full DDL: [`sql/schema.sql`](../sql/schema.sql).

## Result tables (the analytics contract)

The engine never asks the dashboard to compute. It precomputes everything into
four tables, and the UI is a thin reader over them:

| Table | Written by | Read by |
| --- | --- | --- |
| `analytics_kpi` | analytics | KPI cards |
| `analytics_series` | analytics | trend & breakdown charts |
| `analytics_ranking` | analytics | league tables / bar lists |
| `forecast_series` | forecast | projection charts (actual + forecast) |
| `recommendations` | recommend | Decision Center |

This separation is deliberate: it keeps the dashboard trivially portable (any
client that can read Postgres works) and makes the analysis reproducible and
testable independent of the front end.

## Pipeline stages

- **generate** (`athena/generate.py`) — synthesises a realistic dataset with
  embedded, defensible signal (tier and skill effects, a declining sector, a
  weak region, rising skill demand). Deterministic under `ATHENA_SEED`.
- **ingest** (`athena/ingest.py`) — creates the schema and bulk-loads via
  `COPY`, resolving natural keys to surrogate keys for the fact and bridge.
- **analytics** (`athena/analytics/engine.py`) — placement rates, median CTC,
  tier/region/channel breakdowns, university and skill rankings.
- **forecast** (`athena/forecast.py`) — Holt exponential smoothing for monthly
  volume; linear trend projection for cycle-level CTC (overall and the
  declining sector), each with an interval.
- **recommend** (`athena/recommend.py`) — turns the above into structured
  Observation → Business Impact → Recommended Action items, backed by a Welch
  t-test on the internship effect and effect-size-based confidence.

## Modularity

The engine is dataset-agnostic in shape. Swapping `ATHENA_MODULE` and providing
a different generator (retail, HR, customer) reuses the same warehouse pattern,
result-table contract, and dashboard. Only the semantics of the columns change.
