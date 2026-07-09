"use client";

/**
 * useSimulation — the React binding for the Organization Engine.
 *
 * It owns the *cadence* (play/pause/speed, the timer that calls tick) and a
 * bounded history for charting. It owns NOTHING about org logic — every state
 * transition comes back from `engine.tick`. The world is authoritative; React
 * only renders it and decides when the next heartbeat fires.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventKind, EventSeverity, OrgState, SimConfig } from "@athena/engine";
import { engine } from "./engine-client";
import { saveWorld } from "./world";

/** One tick of telemetry — the full vital record, not a decorative subset. */
export interface HistoryPoint {
  day: number;
  cash: number;
  revenue: number;
  expenses: number;
  headcount: number;
  morale: number;
  demand: number;
  innovation: number;
  techDebt: number;
  reputation: number;
  customerSat: number;
  risk: number;
  economy: number; // the macro cycle, so charts can overlay cause
}

/** An event pinned to the day it fired — rendered as a marker on the timeline. */
export interface Marker {
  day: number;
  severity: EventSeverity;
  kind: EventKind;
  title: string;
}

/** ms between ticks for each speed. Lower = faster. */
export const SPEEDS = { pause: 0, slow: 900, normal: 450, fast: 140 } as const;
export type Speed = keyof typeof SPEEDS;

const HISTORY_LIMIT = 3650; // ten simulated years of full-fidelity telemetry
const MARKER_LIMIT = 600;

function snapshot(s: OrgState): HistoryPoint {
  const m = s.metrics;
  return {
    day: s.day,
    cash: m.cash,
    revenue: m.revenue,
    expenses: m.expenses,
    headcount: m.headcount,
    morale: m.morale,
    demand: m.demand,
    innovation: m.innovation,
    techDebt: m.techDebt,
    reputation: m.reputation,
    customerSat: m.customerSat,
    risk: m.risk,
    economy: s.world?.economy ?? 0,
  };
}

/** Which events earn a pin on the timeline (routine kickoffs stay in the feed). */
function isMarker(e: { severity: EventSeverity; kind: EventKind; title: string }): boolean {
  if (e.severity !== "info") return true;
  return e.kind === "board" && /board review/i.test(e.title);
}

export function useSimulation(config: SimConfig, resume?: OrgState | null) {
  const init = () => resume ?? engine.create(config);
  const [state, setState] = useState<OrgState>(init);
  const [history, setHistory] = useState<HistoryPoint[]>(() => [snapshot(init())]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [speed, setSpeed] = useState<Speed>("normal");

  // Keep the latest state in a ref so the timer never closes over a stale world.
  const stateRef = useRef(state);
  stateRef.current = state;
  const sinceSave = useRef(0);

  const step = useCallback(() => {
    const { state: next, events } = engine.tick(stateRef.current);
    stateRef.current = next;
    setState(next);
    setHistory((h) => {
      const out = h.length >= HISTORY_LIMIT ? h.slice(1) : h.slice();
      out.push(snapshot(next));
      return out;
    });
    const pins = events.filter(isMarker);
    if (pins.length) {
      setMarkers((mk) => {
        const out = [...mk, ...pins.map((e) => ({ day: e.day, severity: e.severity, kind: e.kind, title: e.title }))];
        return out.length > MARKER_LIMIT ? out.slice(out.length - MARKER_LIMIT) : out;
      });
    }
    // autosave periodically so a reload resumes roughly where you left off
    if (++sinceSave.current >= 8) {
      sinceSave.current = 0;
      saveWorld(next);
    }
    return next;
  }, []);

  // The heartbeat: a self-scheduling timer, immune to setInterval drift.
  useEffect(() => {
    if (speed === "pause") return;
    if (stateRef.current.status !== "alive") return;
    const id = window.setTimeout(() => {
      const next = step();
      if (next.status !== "alive") setSpeed("pause");
    }, SPEEDS[speed]);
    return () => window.clearTimeout(id);
  }, [speed, state, step]);

  // Persist the world when paused, backgrounded, or unmounted.
  useEffect(() => {
    if (speed === "pause") saveWorld(stateRef.current);
  }, [speed]);
  useEffect(() => {
    const save = () => saveWorld(stateRef.current);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", save);
    };
  }, []);

  const reset = useCallback((cfg: SimConfig) => {
    const fresh = engine.create(cfg);
    stateRef.current = fresh;
    setState(fresh);
    setHistory([snapshot(fresh)]);
    setMarkers([]);
    setSpeed("normal");
    saveWorld(fresh);
  }, []);

  const running = speed !== "pause" && state.status === "alive";

  return useMemo(
    () => ({ state, history, markers, speed, running, setSpeed, step, reset }),
    [state, history, markers, speed, running, step, reset],
  );
}
