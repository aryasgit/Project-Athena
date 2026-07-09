/**
 * The deterministic core. `advance(state) -> { state, events }`.
 *
 * Level 1 of the architecture — the "true intelligence" of Athena. Pure: no I/O,
 * no Date.now(), no Math.random(). All randomness comes from the serialized
 * cursor `state.rngState`, so an entire history is reproducible from a seed.
 *
 * Phase 1: the headline Metrics are no longer computed by formula — they EMERGE.
 * Executives bias the org; departments turn morale + headcount into effectiveness;
 * projects consume that effectiveness and, when they ship, lift innovation,
 * reputation, demand and cash; when they stall they breed tech debt and risk.
 * The vitals are aggregations of all this. Same public contract as before.
 */

import type {
  DepartmentState,
  Driver,
  EmployeeState,
  Metrics,
  OrgEvent,
  OrgState,
  ProjectState,
  TickResult,
} from "../types";
import { Rng } from "./rng";
import { addDays } from "./clock";
import { clamp, effectivenessOf } from "../state";
import { personName, projectName, roleFor } from "../data/names";
import { makeExecutive } from "../data/personas";
import { advanceWorld, seedWorld } from "./world";
import { directiveBias, runOrchestration } from "./orchestration";
import { rollEvents } from "./events";
import { resolveRuleset } from "../ruleset";

const LOG_LIMIT = 80;

type Focus = "innovation" | "efficiency" | "people" | "growth";

export function advance(state: OrgState): TickResult {
  if (state.status === "terminated") return { state, events: [] };

  const rng = new Rng(state.rngState);
  const R = resolveRuleset(state.config.ruleset);
  const m = state.metrics;
  const bias = R.strategyBias[state.config.growthStrategy];
  const events: OrgEvent[] = [];
  const day = state.day + 1;
  const date = addDays(state.date, 1);

  // ── Executive influence → org-wide focus pushes (each 0..1, sum ≈ 1) ──────
  const push = focusPushes(state.agents.executives);
  // the board's standing directive biases the org toward its chosen focus
  const dbias = directiveBias(state.directive?.kind ?? "steady", R.orchestration.directiveStrength);
  push.efficiency += dbias.efficiency ?? 0;
  push.innovation += dbias.innovation ?? 0;
  push.people += dbias.people ?? 0;
  push.growth += dbias.growth ?? 0;

  // ── The external world presses on the org (economy, competitors, supply) ──
  const w = advanceWorld(state.world ?? seedWorld(state.config, rng, R), rng, day, R);
  for (const e of w.events) {
    e.date = date;
    events.push(e);
  }
  const mods = w.mods;

  // ── Departments evolve: morale → productivity → effectiveness, plus churn ─
  let nextId = state.agents.nextId;
  const employees: EmployeeState[] = state.agents.employees.map((e) => ({ ...e }));
  const empByDept = new Map<string, EmployeeState[]>();
  for (const e of employees) {
    if (!empByDept.has(e.deptId)) empByDept.set(e.deptId, []);
    empByDept.get(e.deptId)!.push(e);
  }

  const projectsByDept = new Map<string, number>();
  for (const p of state.agents.projects) {
    if (p.status === "active") projectsByDept.set(p.deptId, (projectsByDept.get(p.deptId) ?? 0) + 1);
  }

  // runway pressure (computed from prior tick's flows as a proxy) feeds morale
  const priorBurn = Math.max(0, m.expenses - m.revenue);
  const priorRunway = priorBurn > 0 ? m.cash / priorBurn : Infinity;
  const runwayPressure = clamp(60 - Math.min(60, priorRunway), 0, 60) / 60;

  const departments: DepartmentState[] = state.agents.departments.map((d) => {
    const workload = (projectsByDept.get(d.id) ?? 0) / Math.max(1, d.headcount / 8);
    const moraleTarget =
      d.morale +
      push.people * 3 -
      runwayPressure * 2.2 -
      clamp(workload - 1, 0, 3) * 0.8 +
      rng.range(-0.5, 0.5);
    const morale = clamp(lerp(d.morale, moraleTarget, R.workforce.moraleInertia));

    const prodTarget = 40 + morale * 0.45 - m.techDebt * 0.12 + push.innovation * 12 + push.efficiency * 8;
    const productivity = clamp(lerp(d.productivity, prodTarget, 0.2));

    let headcount = d.headcount;
    // hiring: healthy cash + growth push → grow; low morale → attrition
    if (runwayPressure < 0.3 && rng.chance(R.workforce.hireChanceBase + push.growth * R.workforce.hireGrowthBonus)) {
      headcount += 1;
    }
    if (morale < R.workforce.attritionMoraleThreshold && rng.chance(R.workforce.attritionChanceBase + (R.workforce.attritionMoraleThreshold - morale) * 0.004)) {
      headcount = Math.max(1, headcount - 1);
      // a notable person may walk
      const roster = empByDept.get(d.id)?.filter((e) => e.status === "active") ?? [];
      if (roster.length && rng.chance(0.4)) {
        const leaver = roster[rng.int(0, roster.length - 1)];
        leaver.status = "left";
        events.push(evt(day, date, "people", "warn", `${leaver.name} resigned`, `${leaver.role} left ${d.name}. Morale in the team is slipping.`));
      }
    }

    return {
      ...d,
      headcount,
      morale,
      productivity,
      effectiveness: effectivenessOf(productivity, morale),
      leadIds: d.leadIds,
    };
  });

  // drift each notable person's morale toward their department's
  const deptMorale = new Map(departments.map((d) => [d.id, d.morale]));
  for (const e of employees) {
    if (e.status !== "active") continue;
    e.morale = clamp(lerp(e.morale, deptMorale.get(e.deptId) ?? e.morale, 0.15) + rng.range(-0.4, 0.4));
    e.tenure += 1;
  }

  const headcount = departments.reduce((s, d) => s + d.headcount, 0);
  const output = departments.reduce((s, d) => s + d.headcount * (d.effectiveness / 100), 0);
  const salesPower = deptEffectiveness(departments, ["sales", "marketing"]);

  // ── Demand: random walk nudged by growth push, reputation, go-to-market ───
  const demand = clamp(
    m.demand + rng.normal() * 1.0 + bias.demand + push.growth * 0.5 +
      (m.reputation - 50) * 0.01 + (salesPower - 50) * 0.008 + mods.demandDelta,
  );

  // ── Revenue emerges from effective output × demand × brand × economy ──────
  const brand = 0.8 + m.reputation / 250;
  const revenue = Math.max(
    0,
    (demand / 100) * output * R.finance.revenuePerOutput * brand * mods.revenueMult * (1 + rng.normal() * 0.05),
  );

  // ── Expenses: payroll (efficiency push trims spend) + overhead + compliance
  const spend = bias.spend * (1 - push.efficiency * 0.12);
  const payroll = headcount * R.finance.costPerHead * spend;
  const overhead = state.config.initialCapital * R.finance.overheadRate;
  const expenses = payroll + overhead + mods.complianceCost + rng.range(0, payroll * 0.03);

  const cash = m.cash + revenue - expenses;
  const netBurn = Math.max(0, expenses - revenue);
  const runwayDays = netBurn > 0 ? cash / netBurn : Infinity;

  // ── Projects: progress, ship, stall, spawn ────────────────────────────────
  const deptById = new Map(departments.map((d) => [d.id, d]));
  let innovationDelta = 0;
  let reputationDelta = 0;
  let demandBonus = 0;
  let cashBonus = 0;
  let debtDelta = 0;
  let activeCount = 0;

  const projects: ProjectState[] = [];
  for (const p of state.agents.projects) {
    if (p.status !== "active") {
      projects.push(p);
      continue;
    }
    const dept = deptById.get(p.deptId);
    const eff = dept ? dept.effectiveness : 50;
    const rate = clamp(
      (eff / 100) * (p.staffing / Math.max(1, p.complexity / 20)) * (1 + push.innovation * 0.4) * mods.supplyMult * rng.range(0.7, 1.3),
      0,
      6,
    );
    const progress = clamp(p.progress + rate);
    const daysActive = p.daysActive + 1;

    if (progress >= 100) {
      innovationDelta += R.projects.shipInnovation + p.complexity * 0.04;
      reputationDelta += R.projects.shipReputation;
      demandBonus += R.projects.shipDemand + p.complexity * 0.02;
      cashBonus += p.value * R.projects.shipCashFraction;
      events.push(evt(day, date, "product", "good", `Shipped: ${p.name}`, `${dept?.name ?? "A team"} delivered ${p.name}. Innovation and demand tick up.`));
      projects.push({ ...p, progress: 100, daysActive, status: "shipped" });
    } else if (daysActive > R.projects.stallDays && rate < R.projects.stallRateThreshold) {
      debtDelta += 1.2;
      events.push(evt(day, date, "product", "warn", `Stalled: ${p.name}`, `${p.name} has lost momentum. Tech debt and risk are accruing.`));
      projects.push({ ...p, progress, daysActive, status: "stalled" });
    } else {
      projects.push({ ...p, progress, daysActive });
      activeCount += 1;
    }
  }

  // spawn new work as capacity allows (bounded)
  const cap =
    state.config.size === "startup"
      ? R.projects.capStartup
      : state.config.size === "scaleup"
        ? R.projects.capScaleup
        : R.projects.capEnterprise;
  if (activeCount < cap && runwayPressure < 0.5 && rng.chance(R.projects.spawnChanceBase + push.growth * 0.06 + push.innovation * 0.04)) {
    const builders = departments.filter((d) => ["engineering", "research", "operations", "marketing"].includes(d.kind));
    const dept = (builders.length ? builders : departments)[rng.int(0, (builders.length ? builders : departments).length - 1)];
    const complexity = clamp(30 + rng.range(0, 55));
    projects.push({
      id: `proj-${nextId++}`,
      name: projectName(rng),
      deptId: dept.id,
      progress: 0,
      complexity,
      value: Math.round(state.config.initialCapital * (0.05 + (complexity / 100) * 0.25)),
      staffing: Math.max(1, Math.round(dept.headcount * rng.range(0.15, 0.4))),
      status: "active",
      daysActive: 0,
    });
    events.push(evt(day, date, "product", "info", `Kicked off: ${projects[projects.length - 1].name}`, `${dept.name} started a new initiative.`));
  }

  // occasionally materialise a notable new hire (texture; bounded per dept)
  if (headcount > m.headcount && rng.chance(0.25)) {
    const growing = departments[rng.int(0, departments.length - 1)];
    const rosterCount = employees.filter((e) => e.deptId === growing.id).length;
    if (rosterCount < R.workforce.rosterCap) {
      employees.push({
        id: `emp-${nextId++}`,
        name: personName(rng),
        deptId: growing.id,
        role: roleFor(growing.kind, rng),
        seniority: (["junior", "mid", "senior"] as const)[rng.int(0, 2)],
        morale: clamp(growing.morale + rng.range(-4, 8)),
        skill: clamp(55 + rng.range(-8, 20)),
        tenure: 0,
        status: "active",
      });
    }
  }

  // ── Vitals emerge from the agents ─────────────────────────────────────────
  const moraleAvg = departments.reduce((s, d) => s + d.morale * d.headcount, 0) / Math.max(1, headcount);
  const innovation = clamp(m.innovation + innovationDelta - m.techDebt * 0.004 + push.innovation * 0.2 - 0.15);
  const techDebt = clamp(m.techDebt + bias.debt + debtDelta - push.efficiency * 0.15 + rng.range(-0.05, 0.1));
  const customerSat = clamp(m.customerSat + (innovation - 50) * 0.012 - (techDebt - 30) * 0.011 + rng.range(-0.3, 0.3));
  const reputation = clamp(m.reputation + (customerSat - m.reputation) * 0.02 + reputationDelta);

  const riskTarget =
    R.risk.techDebtWeight * techDebt + R.risk.runwayWeight * runwayPressure +
    R.risk.moraleWeight * Math.max(0, 60 - moraleAvg) +
    projects.filter((p) => p.status === "stalled").length * R.risk.stalledWeight + mods.riskAdd + rng.range(-2, 2);
  const risk = clamp((1 - R.risk.smoothing) * riskTarget + R.risk.smoothing * m.risk);

  const growth = clamp(((revenue - expenses) / Math.max(1, expenses)) * 40, -100, 100);

  const metrics: Metrics = {
    cash: cash + cashBonus,
    revenue,
    expenses,
    headcount,
    morale: clamp(moraleAvg),
    demand: clamp(demand + demandBonus),
    innovation,
    techDebt,
    reputation,
    customerSat,
    risk,
    growth,
  };

  // ── Stochastic events & disasters perturb the org ─────────────────────────
  const roll = rollEvents({ ...state, day, date, metrics, world: w.world }, rng, day, date, R);
  const evFx = { cash: 0, demand: 0, reputation: 0, morale: 0, customerSat: 0, techDebt: 0, innovation: 0, risk: 0 };
  for (const f of roll.fx) {
    if (f.cash) { metrics.cash += f.cash; evFx.cash += f.cash; }
    if (f.demand) { metrics.demand = clamp(metrics.demand + f.demand); evFx.demand += f.demand; }
    if (f.reputation) { metrics.reputation = clamp(metrics.reputation + f.reputation); evFx.reputation += f.reputation; }
    if (f.morale) { metrics.morale = clamp(metrics.morale + f.morale); evFx.morale += f.morale; }
    if (f.customerSat) { metrics.customerSat = clamp(metrics.customerSat + f.customerSat); evFx.customerSat += f.customerSat; }
    if (f.techDebt) { metrics.techDebt = clamp(metrics.techDebt + f.techDebt); evFx.techDebt += f.techDebt; }
    if (f.innovation) { metrics.innovation = clamp(metrics.innovation + f.innovation); evFx.innovation += f.innovation; }
    if (f.risk) { metrics.risk = clamp(metrics.risk + f.risk); evFx.risk += f.risk; }
    if (f.loseKeyPersonId || f.loseKeyPerson) {
      // an event can name its casualty; otherwise one is drawn at random
      const active = employees.filter((e) => e.status === "active");
      const gone = f.loseKeyPersonId
        ? employees.find((e) => e.id === f.loseKeyPersonId && e.status === "active")
        : active.length
          ? active[rng.int(0, active.length - 1)]
          : undefined;
      if (gone) {
        gone.status = "left";
        const dept = departments.find((d) => d.id === gone.deptId);
        if (dept) dept.headcount = Math.max(1, dept.headcount - 1);
        metrics.headcount = Math.max(1, metrics.headcount - 1);
      }
    }
  }
  for (const e of roll.events) events.push(e);

  // ── Attribution: the model's own terms for what moved each metric ─────────
  const drivers: Driver[] = [];
  const drv = (metric: Driver["metric"], source: string, amount: number) => {
    if (Math.abs(amount) > 0.005) drivers.push({ metric, source, amount: Math.round(amount * 100) / 100 });
  };
  drv("cash", "Revenue", revenue);
  drv("cash", "Payroll", -payroll);
  drv("cash", "Overhead", -overhead);
  drv("cash", "Compliance", -mods.complianceCost);
  drv("cash", "Shipped value", cashBonus);
  drv("cash", "Events", evFx.cash);
  drv("demand", "Macro climate", mods.demandDelta);
  drv("demand", "Strategy", bias.demand);
  drv("demand", "Growth push", push.growth * 0.5);
  drv("demand", "Brand pull", (m.reputation - 50) * 0.01);
  drv("demand", "Go-to-market", (salesPower - 50) * 0.008);
  drv("demand", "Ships", demandBonus);
  drv("demand", "Events", evFx.demand);
  drv("morale", "People focus", push.people * 3);
  drv("morale", "Runway pressure", -runwayPressure * 2.2);
  drv("morale", "Events", evFx.morale);
  drv("innovation", "Ships", innovationDelta);
  drv("innovation", "Debt drag", -m.techDebt * 0.004);
  drv("innovation", "R&D focus", push.innovation * 0.2);
  drv("innovation", "Decay", -0.15);
  drv("innovation", "Events", evFx.innovation);
  drv("techDebt", "Strategy pace", bias.debt);
  drv("techDebt", "Stalled work", debtDelta);
  drv("techDebt", "Efficiency focus", -push.efficiency * 0.15);
  drv("techDebt", "Events", evFx.techDebt);
  drv("risk", "Tech debt", R.risk.techDebtWeight * techDebt);
  drv("risk", "Runway", R.risk.runwayWeight * runwayPressure);
  drv("risk", "Low morale", R.risk.moraleWeight * Math.max(0, 60 - moraleAvg));
  drv("risk", "Stalled work", projects.filter((p) => p.status === "stalled").length * R.risk.stalledWeight);
  drv("risk", "World pressure", mods.riskAdd);
  drv("risk", "Events", evFx.risk);
  drv("reputation", "Customer pull", (customerSat - m.reputation) * 0.02);
  drv("reputation", "Ships", reputationDelta);
  drv("reputation", "Events", evFx.reputation);

  // executives' confidence tracks performance; the disheartened may step down
  const executives = state.agents.executives.map((x) => {
    const confidence = clamp(x.confidence + (growth > 0 ? 0.3 : -0.5) - runwayPressure * 1.5 + rng.range(-0.3, 0.3));
    const tenure = (x.tenure ?? 0) + 1;
    const loyalty = x.traits?.loyalty ?? 60;
    if (x.traits && confidence < 25 && tenure > 120 && rng.chance(((100 - loyalty) / 100) * 0.02)) {
      const successor = makeExecutive(x.id, x.role, rng);
      events.push(evt(day, date, "board", "warn", `${x.name} steps down as ${x.role}`, `After a hard stretch, ${x.name} departs. ${successor.name} — ${successor.archetype} — takes over as ${x.role}.`));
      return successor;
    }
    return { ...x, confidence, tenure };
  });

  // ── Narration: threshold crossings + world events ─────────────────────────
  const cross = (was: number, now: number, t: number) => was >= t && now < t;
  const prevBurn = priorBurn;
  const prevRunway = prevBurn > 0 ? m.cash / prevBurn : Infinity;
  if (cross(m.cash, metrics.cash, 0)) {
    events.push(evt(day, date, "finance", "critical", "Cash reserves exhausted", "The organization is insolvent. Runway has run out."));
  } else if (netBurn > 0 && prevRunway >= 30 && runwayDays < 30) {
    events.push(evt(day, date, "finance", "warn", "Runway under 30 days", `${Math.round(runwayDays)} days left at ~${Math.round(netBurn).toLocaleString()}/day net burn.`));
  }
  if (cross(m.morale, metrics.morale, 40)) {
    events.push(evt(day, date, "people", "warn", "Morale slipping", "Company-wide sentiment fell below 40. Attrition risk rising."));
  }
  if (m.demand < 60 && metrics.demand >= 60) {
    events.push(evt(day, date, "market", "good", "Demand surging", `Market appetite crossed 60 (now ${metrics.demand.toFixed(1)}).`));
  }

  const status: OrgState["status"] = metrics.cash < -expenses * 5 ? "terminated" : state.status;
  if (status === "terminated") {
    events.push(evt(day, date, "system", "critical", "Simulation terminated", "The organization failed. Its history remains for study."));
  }

  // ── Level 2 orchestration: scheduled board reviews set the directive ──────
  const nextAgents = { executives, departments, employees, projects, nextId };
  const orch = runOrchestration(
    { ...state, day, date, metrics, agents: nextAgents, world: w.world },
    day,
    date,
    R,
  );
  for (const e of orch.events) events.push(e);

  const log = [...events, ...state.log].slice(0, LOG_LIMIT);

  return {
    state: {
      ...state,
      day,
      date,
      rngState: rng.state,
      metrics,
      agents: nextAgents,
      world: w.world,
      directive: orch.directive,
      cooldowns: roll.cooldowns,
      drivers,
      log,
      status,
    },
    events,
  };
}

/** Advance the world by n ticks, collecting every event emitted along the way. */
export function advanceBy(state: OrgState, ticks: number): TickResult {
  let cur = state;
  const all: OrgEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    const r = advance(cur);
    cur = r.state;
    all.push(...r.events);
    if (cur.status === "terminated") break;
  }
  return { state: cur, events: all };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function focusPushes(execs: OrgState["agents"]["executives"]): Record<Focus, number> {
  const out: Record<Focus, number> = { innovation: 0, efficiency: 0, people: 0, growth: 0 };
  const total = execs.reduce((s, x) => s + x.influence, 0) || 1;
  for (const x of execs) out[x.focus] += x.influence / total;
  return out;
}

function deptEffectiveness(depts: DepartmentState[], kinds: string[]): number {
  const sel = depts.filter((d) => kinds.includes(d.kind));
  if (!sel.length) return 40;
  return sel.reduce((s, d) => s + d.effectiveness, 0) / sel.length;
}

function evt(
  day: number,
  date: string,
  kind: OrgEvent["kind"],
  severity: OrgEvent["severity"],
  title: string,
  detail: string,
): OrgEvent {
  return { day, date, kind, severity, title, detail };
}
