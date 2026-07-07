/**
 * Simulation time. One tick = one business day (V1).
 *
 * Kept deliberately tiny and pure so the notion of "a day" lives in exactly
 * one place. When ticks later come to mean something else (a shift, an hour),
 * only this file changes.
 */

const DAY_MS = 86_400_000;

/** Advance an ISO date (YYYY-MM-DD) by n days, returning a new ISO date. */
export function addDays(isoDate: string, days: number): string {
  const ms = Date.parse(isoDate + "T00:00:00Z");
  return new Date(ms + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole-day difference between two ISO dates. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(toIso + "T00:00:00Z") - Date.parse(fromIso + "T00:00:00Z")) /
      DAY_MS,
  );
}

/** Human label for a tick relative to inception, e.g. "Day 128". */
export function tickLabel(day: number): string {
  return `Day ${day}`;
}
