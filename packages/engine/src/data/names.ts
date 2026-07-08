/**
 * Deterministic name pools. Every name is drawn from the seeded RNG, so a world
 * is reproducible down to its people and projects.
 */

import type { DepartmentKind, ExecRole } from "../types";
import type { Rng } from "../core/rng";

const FIRST = [
  "Ada", "Ren", "Mara", "Kai", "Ilse", "Theo", "Nadia", "Ivo", "Suki", "Cole",
  "Vera", "Omar", "Lena", "Dax", "Yara", "Pia", "Nils", "Rhea", "Zane", "Mira",
  "Aria", "Bex", "Cyrus", "Dima", "Esa", "Faye", "Goran", "Hana", "Idris", "June",
];
const LAST = [
  "Vance", "Okoye", "Sato", "Reyes", "Novak", "Haas", "Kwon", "Bauer", "Ferro", "Lund",
  "Amari", "Sol", "Dane", "Rook", "Vale", "Cruz", "Wren", "Kade", "Moss", "Pike",
];

const PROJECT_ADJ = [
  "Helix", "Vertex", "Aurora", "Cipher", "Nimbus", "Onyx", "Quanta", "Relay", "Strata", "Tessera",
  "Ion", "Flux", "Prism", "Cobalt", "Meridian", "Halcyon", "Vector", "Atlas", "Echo", "Forge",
];
const PROJECT_NOUN = [
  "Platform", "Engine", "Migration", "Rollout", "Launch", "Rewrite", "Pipeline",
  "Expansion", "Overhaul", "Initiative", "Program", "Push",
];

const DEPT_LABEL: Record<DepartmentKind, string> = {
  engineering: "Engineering",
  sales: "Sales",
  marketing: "Marketing",
  operations: "Operations",
  research: "Research",
  finance: "Finance",
  people: "People",
};

const ROLE_BY_DEPT: Record<DepartmentKind, string[]> = {
  engineering: ["Engineer", "Staff Engineer", "Eng Lead", "Architect"],
  sales: ["Account Exec", "SDR", "Sales Lead", "RevOps"],
  marketing: ["Marketer", "Brand Lead", "Growth", "Content"],
  operations: ["Operator", "PM", "Ops Lead", "Analyst"],
  research: ["Researcher", "Scientist", "Research Lead", "Fellow"],
  finance: ["Analyst", "Controller", "Finance Lead", "Treasurer"],
  people: ["Recruiter", "People Lead", "Partner", "Coordinator"],
};

export function personName(rng: Rng): string {
  return `${FIRST[rng.int(0, FIRST.length - 1)]} ${LAST[rng.int(0, LAST.length - 1)]}`;
}

export function deptLabel(kind: DepartmentKind): string {
  return DEPT_LABEL[kind];
}

export function roleFor(kind: DepartmentKind, rng: Rng): string {
  const roles = ROLE_BY_DEPT[kind];
  return roles[rng.int(0, roles.length - 1)];
}

const COMPETITOR_PREFIX = [
  "North", "Vertex", "Apex", "Nova", "Iron", "Blue", "Hyper", "Core", "Vanta", "Zenith",
  "Delta", "Orbit", "Quant", "Summit", "Titan", "Cobalt", "Lumen", "Astra",
];
const COMPETITOR_SUFFIX = ["Labs", "Systems", "Dynamics", "Works", "Group", "Corp", "Industries", "Collective", "Partners"];

export function competitorName(rng: Rng): string {
  return `${COMPETITOR_PREFIX[rng.int(0, COMPETITOR_PREFIX.length - 1)]} ${
    COMPETITOR_SUFFIX[rng.int(0, COMPETITOR_SUFFIX.length - 1)]
  }`;
}

export function projectName(rng: Rng): string {
  return `${PROJECT_ADJ[rng.int(0, PROJECT_ADJ.length - 1)]} ${
    PROJECT_NOUN[rng.int(0, PROJECT_NOUN.length - 1)]
  }`;
}

export const EXEC_ROLES: ExecRole[] = ["CEO", "CFO", "CTO", "COO", "CMO"];

export const EXEC_FOCUS: Record<ExecRole, ExecutiveFocus> = {
  CEO: "growth",
  CFO: "efficiency",
  CTO: "innovation",
  COO: "efficiency",
  CMO: "growth",
};

type ExecutiveFocus = "innovation" | "efficiency" | "people" | "growth";
