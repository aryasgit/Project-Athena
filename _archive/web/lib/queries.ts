import { sql } from "./db";
import { getModule } from "./module";
import { SNAPSHOT, snapSeries, snapRanking, snapForecast } from "./snapshot";

const asNum = (v: unknown) => (v == null ? null : Number(v));

export type Kpi = {
  metric_key: string;
  label: string;
  value: number;
  unit: string | null;
  delta: number | null;
  context: string | null;
};

export type SeriesPoint = {
  period: string | null;
  dimension: string | null;
  value: number;
};

export type RankingRow = {
  entity: string;
  dimension: string | null;
  metric: number;
  secondary: number | null;
  rank: number;
};

export type ForecastPoint = {
  period: string;
  dimension: string | null;
  yhat: number;
  yhat_lower: number | null;
  yhat_upper: number | null;
  is_forecast: boolean;
};

export type Recommendation = {
  recommendation_key: number;
  domain: string;
  title: string;
  observation: string;
  business_impact: string;
  recommended_action: string;
  priority: string;
  confidence: number | null;
  evidence: Record<string, unknown> | null;
};

const num = (v: unknown) => (v == null ? 0 : Number(v));
const isoDate = (v: unknown): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "");

async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!sql) return fallback;
  try {
    return await run();
  } catch (err) {
    console.error("query failed:", err);
    return fallback;
  }
}

export function getKpis() {
  return safe(async () => {
    const rows = await sql!<Kpi[]>`
      SELECT metric_key, label, value, unit, delta, context
      FROM analytics_kpi WHERE module = ${await getModule()}
      ORDER BY metric_key`;
    return rows.map((r) => ({ ...r, value: num(r.value), delta: r.delta == null ? null : num(r.delta) }));
  }, SNAPSHOT.kpis.map((r) => ({
    metric_key: r.metric_key, label: r.label, unit: r.unit, context: r.context,
    value: num(r.value), delta: asNum(r.delta),
  })) as Kpi[]);
}

export function getSeries(seriesKey: string) {
  return safe(async () => {
    const rows = await sql!<SeriesPoint[]>`
      SELECT period, dimension, value FROM analytics_series
      WHERE module = ${await getModule()} AND series_key = ${seriesKey}
      ORDER BY id`;
    return rows.map((r) => ({ ...r, period: r.period == null ? null : isoDate(r.period), value: num(r.value) }));
  }, snapSeries(seriesKey).map((r) => ({
    period: (r.period as string) ?? null, dimension: (r.dimension as string) ?? null, value: num(r.value),
  })) as SeriesPoint[]);
}

export function getRanking(rankingKey: string) {
  return safe(async () => {
    const rows = await sql!<RankingRow[]>`
      SELECT entity, dimension, metric, secondary, rank FROM analytics_ranking
      WHERE module = ${await getModule()} AND ranking_key = ${rankingKey}
      ORDER BY rank`;
    return rows.map((r) => ({
      ...r, metric: num(r.metric), secondary: r.secondary == null ? null : num(r.secondary),
    }));
  }, snapRanking(rankingKey).map((r) => ({
    entity: r.entity as string, dimension: (r.dimension as string) ?? null,
    metric: num(r.metric), secondary: asNum(r.secondary), rank: num(r.rank),
  })) as RankingRow[]);
}

export function getForecast(seriesKey: string) {
  return safe(async () => {
    const rows = await sql!<ForecastPoint[]>`
      SELECT period, dimension, yhat, yhat_lower, yhat_upper, is_forecast
      FROM forecast_series
      WHERE module = ${await getModule()} AND series_key = ${seriesKey}
      ORDER BY period`;
    return rows.map((r) => ({
      ...r, period: isoDate(r.period), yhat: num(r.yhat),
      yhat_lower: r.yhat_lower == null ? null : num(r.yhat_lower),
      yhat_upper: r.yhat_upper == null ? null : num(r.yhat_upper),
    }));
  }, snapForecast(seriesKey).map((r) => ({
    period: (r.period as string) ?? "", dimension: (r.dimension as string) ?? null,
    yhat: num(r.yhat), yhat_lower: asNum(r.yhat_lower), yhat_upper: asNum(r.yhat_upper),
    is_forecast: Boolean(r.is_forecast),
  })) as ForecastPoint[]);
}

export type ScenarioBaseline = {
  placementRate: number; medianCtc: number; cohort: number;
  internCoverage: number; channelShare: number;
  weakRegion: string; weakRegionRate: number;
};

export function getScenarioBaseline() {
  const fallback = SNAPSHOT.scenarioBaseline as ScenarioBaseline;
  return safe(async () => {
    const [agg] = await sql!<{ rate: number; ctc: number; cohort: number; intern: number; channel: number }[]>`
      WITH latest AS (
        SELECT f.*, s.prior_internship, ch.channel_type
        FROM fact_placement f
        JOIN dim_date d ON d.date_key = f.date_key
        JOIN dim_student s ON s.student_key = f.student_key
        JOIN dim_channel ch ON ch.channel_key = f.channel_key
        WHERE d.placement_cycle = (SELECT max(placement_cycle) FROM dim_date)
      )
      SELECT
        100.0 * avg(is_placed) AS rate,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY ctc_lpa) FILTER (WHERE is_placed = 1) AS ctc,
        count(*) AS cohort,
        100.0 * avg((prior_internship)::int) AS intern,
        100.0 * avg((channel_type IN ('Institutional','Networked'))::int) AS channel
      FROM latest`;
    const region = await sql!<{ entity: string; metric: number }[]>`
      SELECT entity, metric FROM analytics_ranking
      WHERE module = ${await getModule()} AND ranking_key = 'region_placement_rate'
      ORDER BY rank LIMIT 1`;
    return {
      placementRate: num(agg.rate), medianCtc: num(agg.ctc), cohort: num(agg.cohort),
      internCoverage: num(agg.intern), channelShare: num(agg.channel),
      weakRegion: region[0]?.entity ?? fallback.weakRegion,
      weakRegionRate: region[0] ? num(region[0].metric) : fallback.weakRegionRate,
    };
  }, fallback);
}

export function getRecommendations() {
  return safe(async () => {
    const rows = await sql!<Recommendation[]>`
      SELECT recommendation_key, domain, title, observation, business_impact,
             recommended_action, priority, confidence, evidence
      FROM recommendations WHERE module = ${await getModule()}
      ORDER BY
        CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
        recommendation_key`;
    return rows.map((r) => ({ ...r, confidence: r.confidence == null ? null : num(r.confidence) }));
  }, SNAPSHOT.recommendations.map((r) => ({
    recommendation_key: num(r.recommendation_key), domain: r.domain, title: r.title,
    observation: r.observation, business_impact: r.business_impact,
    recommended_action: r.recommended_action, priority: r.priority,
    confidence: asNum(r.confidence), evidence: r.evidence as Record<string, unknown>,
  })) as Recommendation[]);
}
