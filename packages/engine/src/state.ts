/**
 * Organization factory: turns a SimConfig (the "Create Company" inputs) into a
 * newly-born, living OrgState at day 0 — populated with executives, departments,
 * a roster of notable people, and initial projects. This is the ONLY sanctioned
 * way to construct an organization; after this it moves only through advance().
 */

import type {
  AgentPools,
  DepartmentKind,
  DepartmentState,
  EmployeeState,
  ExecutiveState,
  ExecRole,
  Metrics,
  OrgState,
  ProjectState,
  SimConfig,
} from "./types.js";
import { Rng } from "./core/rng.js";
import { deptLabel, personName, projectName, roleFor, EXEC_FOCUS, EXEC_ROLES } from "./data/names.js";

const SIZE_HEADCOUNT: Record<SimConfig["size"], number> = {
  startup: 12,
  scaleup: 80,
  enterprise: 450,
};

const PHILOSOPHY_TILT: Record<SimConfig["philosophy"], Partial<Metrics>> = {
  innovation: { innovation: 68, techDebt: 34, morale: 62 },
  efficiency: { innovation: 46, techDebt: 18, morale: 58 },
  people: { morale: 76, reputation: 60, innovation: 52 },
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

/** Dept "power": how much useful output its people produce, 0..100. */
export function effectivenessOf(productivity: number, morale: number): number {
  return clamp(productivity * (0.55 + morale / 220));
}

function seedExecutives(config: SimConfig, rng: Rng): ExecutiveState[] {
  const roles: ExecRole[] = ["CEO", "CFO", "CTO"];
  if (config.size !== "startup") roles.push("COO");
  if (config.size === "enterprise" || config.departments.includes("marketing")) roles.push("CMO");
  return roles.map((role) => ({
    id: `exec-${role}`,
    name: personName(rng),
    role,
    // the CEO carries the founder's philosophy; the rest carry their office's bias
    focus: role === "CEO" ? config.philosophy : EXEC_FOCUS[role],
    influence: Math.round(clamp(52 + rng.range(-8, 14))),
    confidence: Math.round(clamp(62 + rng.range(-6, 6))),
  })).filter((_, i, arr) => arr.findIndex((r) => r.role === arr[i].role) === i);
}

function seedDepartments(config: SimConfig, total: number, rng: Rng): DepartmentState[] {
  const kinds = config.departments.length
    ? config.departments
    : (["engineering", "sales", "operations"] as DepartmentKind[]);
  const per = Math.max(1, Math.floor(total / kinds.length));
  const tilt = PHILOSOPHY_TILT[config.philosophy];
  return kinds.map((kind, i) => {
    const headcount = i === 0 ? total - per * (kinds.length - 1) : per;
    const morale = clamp((tilt.morale ?? 60) + rng.range(-5, 5));
    const productivity = clamp(54 + rng.range(-6, 8));
    return {
      id: `dept-${kind}`,
      kind,
      name: deptLabel(kind),
      headcount,
      budget: Math.round(config.initialCapital / kinds.length),
      morale,
      productivity,
      effectiveness: effectivenessOf(productivity, morale),
      leadIds: [],
    };
  });
}

/** A bounded roster of notable people (a lead + a couple of key members) per dept. */
function seedEmployees(departments: DepartmentState[], rng: Rng): EmployeeState[] {
  const roster: EmployeeState[] = [];
  for (const dept of departments) {
    const n = Math.min(dept.headcount, rng.int(2, 4));
    for (let i = 0; i < n; i++) {
      const isLead = i === 0;
      const id = `emp-${dept.kind}-${i}`;
      if (isLead) dept.leadIds.push(id);
      roster.push({
        id,
        name: personName(rng),
        deptId: dept.id,
        role: isLead ? `${dept.name} Lead` : roleFor(dept.kind, rng),
        seniority: isLead ? "lead" : (["mid", "senior"] as const)[rng.int(0, 1)],
        morale: clamp(dept.morale + rng.range(-8, 8)),
        skill: clamp(58 + rng.range(-10, 18)),
        tenure: rng.int(30, 900),
        status: "active",
      });
    }
  }
  return roster;
}

function seedProjects(config: SimConfig, departments: DepartmentState[], rng: Rng): ProjectState[] {
  // projects launch out of the "building" departments
  const builders = departments.filter((d) =>
    ["engineering", "research", "operations", "marketing"].includes(d.kind),
  );
  const pool = builders.length ? builders : departments;
  const count = config.size === "startup" ? rng.int(1, 3) : rng.int(3, 6);
  return Array.from({ length: count }, (_, i) => {
    const dept = pool[rng.int(0, pool.length - 1)];
    const complexity = clamp(30 + rng.range(0, 50));
    return {
      id: `proj-${i}`,
      name: projectName(rng),
      deptId: dept.id,
      progress: clamp(rng.range(0, 25)),
      complexity,
      value: Math.round(config.initialCapital * (0.05 + (complexity / 100) * 0.25)),
      staffing: Math.max(1, Math.round(dept.headcount * rng.range(0.15, 0.4))),
      status: "active",
      daysActive: rng.int(0, 40),
    };
  });
}

export function createOrganization(config: SimConfig): OrgState {
  const rng = new Rng(config.seed | 0);
  const total = SIZE_HEADCOUNT[config.size];
  const tilt = PHILOSOPHY_TILT[config.philosophy];

  const executives = seedExecutives(config, rng);
  const departments = seedDepartments(config, total, rng);
  const employees = seedEmployees(departments, rng);
  const projects = seedProjects(config, departments, rng);

  const headcount = departments.reduce((s, d) => s + d.headcount, 0);
  const moraleAvg =
    departments.reduce((s, d) => s + d.morale * d.headcount, 0) / Math.max(1, headcount);

  const metrics: Metrics = {
    cash: config.initialCapital,
    revenue: 0,
    expenses: 0,
    headcount,
    morale: clamp(moraleAvg),
    demand: clamp((tilt.demand ?? 50) + rng.range(-6, 6)),
    innovation: clamp(tilt.innovation ?? 50),
    techDebt: clamp(tilt.techDebt ?? 22),
    reputation: clamp(tilt.reputation ?? 50),
    customerSat: clamp(58 + rng.range(-5, 5)),
    risk: clamp(RISK_BASE[config.riskAppetite]),
    growth: 0,
  };

  const agents: AgentPools = {
    executives,
    departments,
    employees,
    projects,
    nextId: projects.length,
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
        detail: `${config.industry} · ${headcount} people across ${departments.length} departments · ${config.initialCapital.toLocaleString()} capital · ${config.philosophy} philosophy · led by ${executives[0]?.name ?? "the founder"}.`,
      },
    ],
    status: "alive",
  };
}
