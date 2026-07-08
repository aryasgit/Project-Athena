"use client";

/**
 * The "active world" config layer: what company are we simulating, and how do we
 * persist the choice. The Create-Company flow writes a SimConfig here; the
 * Observatory reads it. (Full-state resume is layered on in worldStore.)
 */

import type {
  DepartmentKind,
  GrowthStrategy,
  Industry,
  OrgState,
  Philosophy,
  RiskAppetite,
  SimConfig,
  CompanySize,
} from "@athena/engine";

export const CONFIG_KEY = "athena:config:v1";
export const WORLD_KEY = "athena:world:v1";

export const DEFAULT_CONFIG: SimConfig = {
  seed: 1337,
  name: "Meridian Systems",
  industry: "software",
  initialCapital: 1_500_000,
  philosophy: "innovation",
  size: "scaleup",
  growthStrategy: "aggressive",
  riskAppetite: "balanced",
  departments: ["engineering", "sales", "marketing", "operations", "research"],
  startDate: "2026-01-01",
};

export function randomSeed(): number {
  // UI-side randomness only — never used inside the deterministic engine.
  return Math.floor(Math.random() * 1_000_000_000);
}

export function loadConfig(): SimConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<SimConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: SimConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* storage unavailable — the world still runs, just won't persist */
  }
}

// ── Full-world persistence (resume on reload) ───────────────────────────────

export function loadWorld(): OrgState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORLD_KEY);
    return raw ? (JSON.parse(raw) as OrgState) : null;
  } catch {
    return null;
  }
}

export function saveWorld(state: OrgState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORLD_KEY, JSON.stringify(state));
  } catch {
    /* storage full/unavailable — the world keeps running, just won't resume */
  }
}

export function clearWorld(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WORLD_KEY);
  } catch {
    /* ignore */
  }
}

// ── Option metadata for the Create-Company console ──────────────────────────

export type Option<T> = { value: T; label: string; hint?: string };

export const INDUSTRIES: Option<Industry>[] = [
  { value: "software", label: "Software" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "finance", label: "Finance" },
  { value: "retail", label: "Retail" },
  { value: "biotech", label: "Biotech" },
];

export const PHILOSOPHIES: Option<Philosophy>[] = [
  { value: "innovation", label: "Innovation", hint: "Move fast, invest in R&D, tolerate debt" },
  { value: "efficiency", label: "Efficiency", hint: "Lean, margin-focused, cautious hiring" },
  { value: "people", label: "People", hint: "Morale & retention first" },
  { value: "growth", label: "Growth", hint: "Capture market share aggressively" },
];

export const SIZES: Option<CompanySize>[] = [
  { value: "startup", label: "Startup", hint: "~12 people" },
  { value: "scaleup", label: "Scaleup", hint: "~80 people" },
  { value: "enterprise", label: "Enterprise", hint: "~450 people" },
];

export const STRATEGIES: Option<GrowthStrategy>[] = [
  { value: "conservative", label: "Conservative", hint: "Spend less, grow slow" },
  { value: "organic", label: "Organic", hint: "Balanced growth" },
  { value: "aggressive", label: "Aggressive", hint: "Spend hard, grow fast" },
];

export const RISK: Option<RiskAppetite>[] = [
  { value: "averse", label: "Averse" },
  { value: "balanced", label: "Balanced" },
  { value: "seeking", label: "Seeking" },
];

export const CAPITAL_TIERS: Option<number>[] = [
  { value: 250_000, label: "$250K", hint: "Lean" },
  { value: 1_500_000, label: "$1.5M", hint: "Seed" },
  { value: 8_000_000, label: "$8M", hint: "Series" },
  { value: 40_000_000, label: "$40M", hint: "War chest" },
];

export const DEPARTMENTS: Option<DepartmentKind>[] = [
  { value: "engineering", label: "Engineering" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "research", label: "Research" },
  { value: "finance", label: "Finance" },
  { value: "people", label: "People" },
];
