/**
 * Executive personas. A leader is no longer a role + a focus word — they are an
 * archetype with traits that shape how they lead, a short bio, and a tenure that
 * can end (see succession in the engine). Focus flows from the archetype, so the
 * mix of personalities on the board genuinely steers the organization.
 */

import type { ExecRole, ExecTraits, ExecutiveState } from "../types";
import type { Rng } from "../core/rng";
import { personName } from "./names";
import { clamp } from "../state";

type Focus = "innovation" | "efficiency" | "people" | "growth";

interface Archetype {
  name: string;
  focus: Focus;
  tagline: string;
  // trait centres (0..100); actual values jitter around these
  risk: number;
  decisiveness: number;
  temperament: number; // high = calm/steady, low = volatile
  loyalty: number;
  ego: number;
}

const ARCHETYPES: Archetype[] = [
  { name: "The Visionary", focus: "innovation", tagline: "bets big on what doesn't exist yet", risk: 78, decisiveness: 62, temperament: 45, loyalty: 55, ego: 74 },
  { name: "The Operator", focus: "efficiency", tagline: "makes the machine run without drama", risk: 38, decisiveness: 80, temperament: 78, loyalty: 66, ego: 40 },
  { name: "The Rainmaker", focus: "growth", tagline: "lives to capture the market", risk: 72, decisiveness: 76, temperament: 50, loyalty: 48, ego: 78 },
  { name: "The Steward", focus: "people", tagline: "builds teams that stay", risk: 34, decisiveness: 55, temperament: 82, loyalty: 84, ego: 34 },
  { name: "The Technologist", focus: "innovation", tagline: "ships depth over hype", risk: 55, decisiveness: 70, temperament: 66, loyalty: 62, ego: 46 },
  { name: "The Closer", focus: "growth", tagline: "always be closing", risk: 64, decisiveness: 82, temperament: 44, loyalty: 40, ego: 70 },
  { name: "The Guardian", focus: "efficiency", tagline: "protects the balance sheet", risk: 22, decisiveness: 68, temperament: 80, loyalty: 74, ego: 36 },
  { name: "The Diplomat", focus: "people", tagline: "keeps the coalition together", risk: 40, decisiveness: 58, temperament: 76, loyalty: 80, ego: 42 },
];

// which archetypes tend to fill which chair
const ROLE_POOL: Record<ExecRole, string[]> = {
  CEO: ["The Visionary", "The Rainmaker", "The Operator", "The Steward"],
  CFO: ["The Guardian", "The Operator"],
  CTO: ["The Technologist", "The Visionary"],
  COO: ["The Operator", "The Guardian"],
  CMO: ["The Rainmaker", "The Closer"],
};

function jitter(centre: number, rng: Rng): number {
  return Math.round(clamp(centre + rng.range(-12, 12)));
}

/** Build a fresh executive for a role. `preferFocus` (the founder's philosophy) can steer the CEO. */
export function makeExecutive(
  id: string,
  role: ExecRole,
  rng: Rng,
  preferFocus?: Focus,
): ExecutiveState {
  let pool = ROLE_POOL[role].map((n) => ARCHETYPES.find((a) => a.name === n)!);
  if (role === "CEO" && preferFocus) {
    const aligned = ARCHETYPES.filter((a) => a.focus === preferFocus);
    if (aligned.length) pool = aligned;
  }
  const arc = pool[rng.int(0, pool.length - 1)];
  const traits: ExecTraits = {
    risk: jitter(arc.risk, rng),
    decisiveness: jitter(arc.decisiveness, rng),
    temperament: jitter(arc.temperament, rng),
    loyalty: jitter(arc.loyalty, rng),
    ego: jitter(arc.ego, rng),
  };
  const name = personName(rng);
  return {
    id,
    name,
    role,
    focus: arc.focus,
    archetype: arc.name,
    bio: `${arc.name} — ${arc.tagline}.`,
    traits,
    influence: Math.round(clamp(38 + traits.ego * 0.3 + traits.decisiveness * 0.2)),
    confidence: Math.round(clamp(60 + rng.range(-6, 6))),
    tenure: 0,
  };
}
