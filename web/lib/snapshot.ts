/**
 * Static snapshot of the warehouse result tables, exported by `athena snapshot`.
 * When DATABASE_URL is unset (for example a plain Vercel deploy), the query
 * layer reads this instead of Postgres, so the dashboard is fully self-contained.
 */
import snapshot from "@/data/snapshot.json";

export type Snapshot = typeof snapshot;
export const SNAPSHOT = snapshot as Snapshot;

type AnyRow = Record<string, unknown>;

export const snapSeries = (key: string): AnyRow[] =>
  ((SNAPSHOT.series as Record<string, AnyRow[]>)[key] ?? []);
export const snapRanking = (key: string): AnyRow[] =>
  ((SNAPSHOT.rankings as Record<string, AnyRow[]>)[key] ?? []);
export const snapForecast = (key: string): AnyRow[] =>
  ((SNAPSHOT.forecasts as Record<string, AnyRow[]>)[key] ?? []);
