/**
 * Organization factory: turns a SimConfig (the "Create Company" inputs) into a
 * newly-born, living OrgState at day 0. This is the ONLY sanctioned way to
 * construct an organization — after this, the world moves only through advance().
 */

import type {
  AgentPools,
  DepartmentKind,
  DepartmentState,
  Metrics,
  OrgState,
  SimConfig,
} from "./types";
import { Rng } from "./core/rng";

const SIZE_HEADCOUNT: Record<SimConfig["size"], number> = {
  startup: 12,
  scaleup: 80,
  enterprise: 450,
};

// Philosophy tilts the org's starting temperament.
const PHILOSOPHY_TILT: Record<
  SimConfig["philosophy"],
  Partial<Metrics>
> = {
  innovation: { innovation: 68, techDebt: 34, morale: 62 },
  efficiency: { innovation: 46, techDebt: 18, morale: 58 },
  people: { morale: 74, reputation: 60, innovation: 52 },
  growth: { demand: 66, risk: 46, morale: 60 },
};

const RISK_BASE: Record<SimConfig["riskAppetite"], number> = {
  averse: 24,
  balanced: 38,
  seeking: 56,
};

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function seedDepartments(config: SimConfig, totalHeadcount: number): DepartmentState[] {
  const kinds = config.departments.length
    ? config.departments
    : (["engineering", "sales", "operations"] as DepartmentKind[]);
  const per = Math.max(1, Math.floor(totalHeadcount / kinds.length));
  return kinds.map((kind, i) => ({
    id: `dept-${kind}`,
    kind,
    headcount: i === 0 ? totalHeadcount - per * (kinds.length - 1) : per,
    budget: Math.round(config.initialCapital / kinds.length),
    effectiveness: 55,
  }));
}

export function createOrganization(config: SimConfig): OrgState {
  const rng = new Rng(config.seed | 0);
  const headcount = SIZE_HEADCOUNT[config.size];
  const tilt = PHILOSOPHY_TILT[config.philosophy];

  const metrics: Metrics = {
    cash: config.initialCapital,
    revenue: 0,
    expenses: 0,
    headcount,
    morale: clamp(tilt.morale ?? 60),
    demand: clamp(tilt.demand ?? 50 + rng.range(-6, 6)),
    innovation: clamp(tilt.innovation ?? 50),
    techDebt: clamp(tilt.techDebt ?? 22),
    reputation: clamp(tilt.reputation ?? 50),
    customerSat: clamp(58 + rng.range(-5, 5)),
    risk: clamp(RISK_BASE[config.riskAppetite]),
    growth: 0,
  };

  const agents: AgentPools = {
    departments: seedDepartments(config, headcount),
  };

  return {
    version: 1,
    config,
    day: 0,
    date: config.startDate,
    rngState: rng.state,
    metrics,
    agents,
    log: [
      {
        day: 0,
        date: config.startDate,
        kind: "system",
        severity: "good",
        title: `${config.name} founded`,
        detail: `${config.industry} · ${headcount} people · ${config.initialCapital.toLocaleString()} capital · ${config.philosophy} philosophy.`,
      },
    ],
    status: "alive",
  };
}
