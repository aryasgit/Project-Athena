import { sql, MODULE } from "./db";

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
      FROM analytics_kpi WHERE module = ${MODULE}
      ORDER BY metric_key`;
    return rows.map((r) => ({ ...r, value: num(r.value), delta: r.delta == null ? null : num(r.delta) }));
  }, [] as Kpi[]);
}

export function getSeries(seriesKey: string) {
  return safe(async () => {
    const rows = await sql!<SeriesPoint[]>`
      SELECT period, dimension, value FROM analytics_series
      WHERE module = ${MODULE} AND series_key = ${seriesKey}
      ORDER BY id`;
    return rows.map((r) => ({ ...r, period: r.period == null ? null : isoDate(r.period), value: num(r.value) }));
  }, [] as SeriesPoint[]);
}

export function getRanking(rankingKey: string) {
  return safe(async () => {
    const rows = await sql!<RankingRow[]>`
      SELECT entity, dimension, metric, secondary, rank FROM analytics_ranking
      WHERE module = ${MODULE} AND ranking_key = ${rankingKey}
      ORDER BY rank`;
    return rows.map((r) => ({
      ...r, metric: num(r.metric), secondary: r.secondary == null ? null : num(r.secondary),
    }));
  }, [] as RankingRow[]);
}

export function getForecast(seriesKey: string) {
  return safe(async () => {
    const rows = await sql!<ForecastPoint[]>`
      SELECT period, dimension, yhat, yhat_lower, yhat_upper, is_forecast
      FROM forecast_series
      WHERE module = ${MODULE} AND series_key = ${seriesKey}
      ORDER BY period`;
    return rows.map((r) => ({
      ...r, period: isoDate(r.period), yhat: num(r.yhat),
      yhat_lower: r.yhat_lower == null ? null : num(r.yhat_lower),
      yhat_upper: r.yhat_upper == null ? null : num(r.yhat_upper),
    }));
  }, [] as ForecastPoint[]);
}

export function getRecommendations() {
  return safe(async () => {
    const rows = await sql!<Recommendation[]>`
      SELECT recommendation_key, domain, title, observation, business_impact,
             recommended_action, priority, confidence, evidence
      FROM recommendations WHERE module = ${MODULE}
      ORDER BY
        CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
        recommendation_key`;
    return rows.map((r) => ({ ...r, confidence: r.confidence == null ? null : num(r.confidence) }));
  }, [] as Recommendation[]);
}
