/**
 * The external world — the environment the organization lives inside.
 *
 * A slow economic cycle, sector sentiment, regulators, supply conditions and a
 * handful of competitors all evolve each tick and press on the org. This module
 * owns that evolution and returns a set of *modifiers* the org engine applies to
 * demand, revenue, expenses, project throughput and risk. Deterministic: all
 * randomness comes from the shared seeded cursor passed in.
 */

import type { Competitor, OrgEvent, SimConfig, WorldState } from "../types";
import type { Rng } from "./rng";
import { clamp } from "../state";
import { competitorName } from "../data/names";

/** How the world tilts the org this tick. */
export interface WorldModifiers {
  demandDelta: number; // additive nudge to the demand walk
  revenueMult: number; // multiplies revenue (boom > 1, recession < 1)
  complianceCost: number; // added to expenses (regulation burden)
  supplyMult: number; // scales project throughput (disruption < 1)
  riskAdd: number; // added to the risk target
}

const CYCLE_DAYS = 730; // ~two-year boom/bust wave

export function seedWorld(config: SimConfig, rng: Rng): WorldState {
  const n = config.size === "startup" ? 2 : config.size === "scaleup" ? 3 : 4;
  const competitors: Competitor[] = Array.from({ length: n }, (_, i) => ({
    id: `comp-${i}`,
    name: competitorName(rng),
    strength: clamp(45 + rng.range(-15, 20)),
    aggression: clamp(40 + rng.range(-15, 30)),
  }));
  return {
    economy: rng.range(-15, 15),
    economyPhase: rng.range(0, Math.PI * 2),
    sentiment: clamp(55 + rng.range(-8, 8)),
    regulation: clamp(config.industry === "finance" || config.industry === "biotech" ? 45 : 22),
    supply: clamp(90 + rng.range(-6, 6)),
    competitors,
  };
}

export function advanceWorld(
  prev: WorldState,
  rng: Rng,
  day: number,
): { world: WorldState; events: OrgEvent[]; mods: WorldModifiers } {
  const events: OrgEvent[] = [];

  // economy: a smooth cycle plus drift
  const economyPhase = prev.economyPhase + (Math.PI * 2) / CYCLE_DAYS;
  const economy = clamp(Math.sin(economyPhase) * 55 + rng.range(-3, 3), -100, 100);

  const sentiment = clamp(prev.sentiment + rng.normal() * 0.8 + economy * 0.004);

  // regulation drifts up slowly; supply mostly healthy with occasional shocks
  let regulation = clamp(prev.regulation + rng.range(-0.05, 0.12));
  let supply = clamp(prev.supply + (90 - prev.supply) * 0.05 + rng.range(-0.5, 0.5));

  // competitors drift; a strong+aggressive one occasionally makes a move
  let competitivePressure = 0;
  const competitors = prev.competitors.map((c) => {
    const strength = clamp(c.strength + rng.range(-0.4, 0.5));
    competitivePressure += strength;
    return { ...c, strength };
  });
  competitivePressure = competitivePressure / Math.max(1, competitors.length);

  // periodic environmental shocks (deterministic cadence + seeded selection)
  if (day % 45 === 0 && competitors.length) {
    const c = competitors[rng.int(0, competitors.length - 1)];
    if (rng.chance(c.aggression / 100)) {
      c.strength = clamp(c.strength + 6);
      events.push(mkt("warn", `${c.name} makes a move`, `${c.name} launched aggressively — expect demand and pricing pressure.`, day));
    }
  }
  if (day % 120 === 0) {
    regulation = clamp(regulation + rng.range(4, 10));
    events.push(evt("world", "info", "New regulation enacted", "Compliance requirements tightened; overhead rises.", day));
  }
  if (day % 75 === 0 && rng.chance(0.5)) {
    supply = clamp(supply - rng.range(15, 35));
    events.push(evt("world", "warn", "Supply chain disruption", "Upstream constraints will slow delivery and raise costs.", day));
  }

  const world: WorldState = { economy, economyPhase, sentiment, regulation, supply, competitors };

  const mods: WorldModifiers = {
    demandDelta: economy * 0.015 + (sentiment - 50) * 0.01 - (competitivePressure - 45) * 0.02,
    revenueMult: 1 + economy / 320,
    complianceCost: regulation * 12,
    supplyMult: 0.6 + (supply / 100) * 0.4,
    riskAdd: Math.max(0, -economy) * 0.08 + Math.max(0, competitivePressure - 55) * 0.15 + regulation * 0.03,
  };

  return { world, events, mods };
}

function evt(kind: OrgEvent["kind"], severity: OrgEvent["severity"], title: string, detail: string, day: number): OrgEvent {
  return { day, date: "", kind, severity, title, detail };
}
function mkt(severity: OrgEvent["severity"], title: string, detail: string, day: number): OrgEvent {
  return evt("market", severity, title, detail, day);
}
