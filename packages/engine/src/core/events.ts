/**
 * The event library — the texture of the world.
 *
 * A large, data-driven registry of concrete situations across five domains
 * (people, product, market, finance, world) plus black-swan disasters. Each
 * event has a state-dependent trigger probability, a cooldown, and a specific
 * attribute effect that perturbs the metrics — so every pin on the timeline
 * means something particular. Details are generated against live state where
 * possible (a named employee is poached, a named competitor stumbles), and the
 * selection is seeded, so histories stay reproducible. Extensible: add a row,
 * get a new possible history.
 */

import type { EventKind, EventSeverity, OrgEvent, OrgState } from "../types";
import type { Ruleset } from "../ruleset";
import type { Rng } from "./rng";

export type EventClass = "internal" | "market" | "macro" | "disaster";

/** A perturbation to the org. Numeric fields are additive deltas. */
export interface EventFx {
  cash?: number;
  demand?: number;
  reputation?: number;
  morale?: number;
  risk?: number;
  customerSat?: number;
  techDebt?: number;
  innovation?: number;
  /** lose a random notable person */
  loseKeyPerson?: boolean;
  /** lose THIS notable person (named in the event detail) */
  loseKeyPersonId?: string;
}

export interface EventDef {
  id: string;
  cls: EventClass;
  kind: EventKind;
  severity: EventSeverity;
  minDay: number;
  cooldown: number;
  chance: (s: OrgState) => number;
  apply: (s: OrgState, rng: Rng) => { title: string; detail: string; fx: EventFx };
}

// ── helpers ──────────────────────────────────────────────────────────────────

const cashPct = (s: OrgState, p: number) => Math.round(s.metrics.cash * p);
const revDays = (s: OrgState, d: number) => Math.round(s.metrics.revenue * d);

function anyEmployee(s: OrgState, rng: Rng) {
  const active = s.agents.employees.filter((e) => e.status === "active");
  return active.length ? active[rng.int(0, active.length - 1)] : null;
}
function anyCompetitor(s: OrgState, rng: Rng) {
  const c = s.world.competitors;
  return c.length ? c[rng.int(0, c.length - 1)] : null;
}
function anyDept(s: OrgState, rng: Rng) {
  const d = s.agents.departments;
  return d[rng.int(0, d.length - 1)];
}
function anyExec(s: OrgState, rng: Rng) {
  const x = s.agents.executives;
  return x[rng.int(0, x.length - 1)];
}
function pick<T>(rng: Rng, arr: T[]): T {
  return arr[rng.int(0, arr.length - 1)];
}

const d = (
  id: string,
  cls: EventClass,
  kind: EventKind,
  severity: EventSeverity,
  minDay: number,
  cooldown: number,
  chance: EventDef["chance"],
  apply: EventDef["apply"],
): EventDef => ({ id, cls, kind, severity, minDay, cooldown, chance, apply });

// ── PEOPLE ───────────────────────────────────────────────────────────────────

const PEOPLE: EventDef[] = [
  d("poached", "internal", "people", "warn", 40, 50,
    (s) => (s.metrics.morale < 55 ? 0.004 : 0.0012),
    (s, rng) => {
      const who = anyEmployee(s, rng);
      const rival = anyCompetitor(s, rng);
      if (!who) return { title: "Recruiter raid deflected", detail: "A rival tried to poach the team and came away empty.", fx: { morale: 1 } };
      return {
        title: `${who.name} poached${rival ? ` by ${rival.name}` : ""}`,
        detail: `${who.role} (${who.seniority}) accepted a rival offer. Their knowledge leaves with them.`,
        fx: { morale: -4, innovation: -2, risk: 3, loseKeyPersonId: who.id },
      };
    }),
  d("star-hire", "internal", "people", "good", 30, 60,
    (s) => (s.metrics.reputation > 55 ? 0.0035 : 0.001),
    (s, rng) => {
      const dept = anyDept(s, rng);
      return { title: `Star hire lands in ${dept.name}`, detail: `A senior industry figure chose ${s.config.name} over bigger offers. The team is energised.`, fx: { morale: 4, innovation: 3, reputation: 2 } };
    }),
  d("burnout-wave", "internal", "people", "warn", 40, 45,
    (s) => (s.metrics.morale < 45 ? 0.005 : 0.0008),
    () => ({ title: "Burnout wave in the trenches", detail: "Sustained crunch is showing: sick days up, output down, exit interviews booked.", fx: { morale: -6, techDebt: 3 } })),
  d("union-rumblings", "internal", "people", "info", 90, 150,
    (s) => (s.metrics.morale < 42 ? 0.003 : 0.0003),
    () => ({ title: "Organising rumblings", detail: "Employees are quietly discussing collective representation. Leadership takes notice.", fx: { morale: 2, risk: 3 } })),
  d("offsite-high", "internal", "people", "good", 50, 90,
    (s) => (s.metrics.cash > 0 && s.metrics.morale > 50 ? 0.003 : 0.0008),
    () => ({ title: "Offsite pays off", detail: "A week of alignment and rest. Teams return with a shared map and better tempo.", fx: { morale: 5, innovation: 1 } })),
  d("glassdoor-slam", "internal", "people", "warn", 60, 100,
    (s) => (s.metrics.morale < 48 ? 0.0035 : 0.0008),
    () => ({ title: "Brutal review goes viral", detail: "An ex-employee's account of the culture is being screenshotted everywhere. Hiring gets harder.", fx: { reputation: -5, morale: -2 } })),
  d("intern-class", "internal", "people", "good", 100, 200,
    () => 0.0018,
    (s, rng) => ({ title: "Exceptional intern class", detail: `${anyDept(s, rng).name} reports the strongest cohort in years; two converted early.`, fx: { morale: 2, innovation: 2 } })),
  d("exec-feud", "internal", "people", "warn", 80, 130,
    (s) => (s.agents.executives.length > 3 ? 0.0018 : 0.0005),
    (s, rng) => {
      const a = anyExec(s, rng);
      let b = anyExec(s, rng);
      if (b.id === a.id) b = s.agents.executives.find((x) => x.id !== a.id) ?? b;
      return { title: `${a.role}–${b.role} rift goes public`, detail: `${a.name} and ${b.name} clashed in an all-hands. Teams are picking sides.`, fx: { morale: -4, risk: 4 } };
    }),
  d("hackathon", "internal", "product", "good", 45, 80,
    (s) => (s.metrics.innovation > 45 ? 0.0032 : 0.001),
    (s, rng) => ({ title: "Hackathon breakthrough", detail: `A 48-hour build out of ${anyDept(s, rng).name} is being fast-tracked into the roadmap.`, fx: { innovation: 4, morale: 3 } })),
  d("visa-snag", "internal", "people", "warn", 120, 200,
    () => 0.001,
    () => ({ title: "Immigration snag hits key staff", detail: "Work-permit delays leave two specialists stranded abroad for a quarter.", fx: { morale: -2, innovation: -2, risk: 2 } })),
];

// ── PRODUCT ──────────────────────────────────────────────────────────────────

const PRODUCT: EventDef[] = [
  d("breakthrough", "internal", "product", "good", 20, 60,
    (s) => (s.metrics.innovation > 60 ? 0.004 : 0.001),
    () => ({ title: "R&D breakthrough", detail: "A research bet paid off — a genuine product edge competitors can't copy quickly.", fx: { innovation: 6, demand: 4, reputation: 3 } })),
  d("patent", "internal", "product", "good", 90, 180,
    (s) => (s.metrics.innovation > 55 ? 0.002 : 0.0004),
    () => ({ title: "Patent granted", detail: "Core IP is now defensible. Investors and partners take note.", fx: { reputation: 4, risk: -3 } })),
  d("critical-bug", "internal", "product", "warn", 30, 55,
    (s) => (s.metrics.techDebt > 45 ? 0.0045 : 0.0012),
    () => ({ title: "Critical bug in production", detail: "A severe defect slipped through review. All-hands firefighting for a week.", fx: { customerSat: -5, techDebt: 2, morale: -2 } })),
  d("debt-paydown", "internal", "product", "good", 60, 100,
    (s) => (s.metrics.techDebt > 50 ? 0.003 : 0.0006),
    () => ({ title: "Refactor lands clean", detail: "A disciplined cleanup retired years of shortcuts. The codebase breathes again.", fx: { techDebt: -7, morale: 2, innovation: 1 } })),
  d("oss-traction", "internal", "product", "good", 70, 140,
    (s) => (s.config.industry === "software" ? 0.002 : 0.0005),
    () => ({ title: "Open-source release takes off", detail: "The developer community adopted the tooling; inbound interest follows.", fx: { reputation: 4, demand: 3, innovation: 2 } })),
  d("feature-flop", "internal", "product", "warn", 50, 90,
    (s) => (s.metrics.customerSat < 55 ? 0.003 : 0.001),
    () => ({ title: "Flagship feature flops", detail: "Months of work met with a shrug. Usage graphs are flat; morale isn't.", fx: { morale: -3, demand: -2, innovation: -1 } })),
  d("design-award", "internal", "product", "good", 100, 200,
    (s) => (s.metrics.customerSat > 60 ? 0.0018 : 0.0004),
    () => ({ title: "Product wins design award", detail: "Industry recognition for craft. The brand gains a halo.", fx: { reputation: 5, customerSat: 2 } })),
  d("security-audit", "internal", "product", "good", 80, 160,
    (s) => (s.metrics.techDebt < 40 ? 0.002 : 0.0006),
    () => ({ title: "Clean security audit", detail: "External auditors found nothing material. Enterprise deals unblock.", fx: { reputation: 3, demand: 2, risk: -4 } })),
];

// ── MARKET ───────────────────────────────────────────────────────────────────

const MARKET: EventDef[] = [
  d("big-client", "market", "market", "good", 40, 70,
    (s) => (s.metrics.demand > 55 ? 0.0035 : 0.0012),
    (s) => ({ title: "Marquee client signs", detail: "A household name closed after a long courtship — reference-able and loud about it.", fx: { cash: revDays(s, 20), demand: 4, reputation: 4 } })),
  d("client-loss", "market", "market", "warn", 60, 80,
    (s) => (s.metrics.customerSat < 48 ? 0.004 : 0.001),
    (s) => ({ title: "Anchor client walks", detail: "A top account churned at renewal, citing execution. Revenue and confidence take the hit.", fx: { cash: -revDays(s, 12), demand: -4, reputation: -3 } })),
  d("viral-moment", "market", "market", "good", 25, 90,
    (s) => (s.metrics.demand > 65 && s.metrics.reputation > 55 ? 0.004 : 0.001),
    () => ({ title: "The product goes viral", detail: "A wave of organic attention. Sign-ups spike and the brand carries further.", fx: { demand: 9, reputation: 6 } })),
  d("analyst-up", "market", "market", "good", 90, 160,
    (s) => (s.metrics.growth > 8 ? 0.0025 : 0.0005),
    (s) => ({ title: "Analyst upgrade", detail: `A major research firm named ${s.config.name} a category leader. Procurement doors open.`, fx: { demand: 5, reputation: 4 } })),
  d("analyst-down", "market", "market", "warn", 90, 160,
    (s) => (s.metrics.growth < -5 ? 0.003 : 0.0006),
    () => ({ title: "Analyst downgrade", detail: "A cautionary note on execution risk is circulating among buyers.", fx: { demand: -4, reputation: -3 } })),
  d("pricing-war", "market", "market", "warn", 45, 70,
    (s) => (s.world.competitors.some((c) => c.strength > 60) ? 0.004 : 0.0015),
    (s, rng) => {
      const c = anyCompetitor(s, rng);
      return { title: "Price war erupts", detail: `${c?.name ?? "A rival"} slashed list prices by a third. Deals stall while buyers re-quote.`, fx: { demand: -6, reputation: -1 } };
    }),
  d("rival-stumbles", "market", "market", "good", 60, 110,
    () => 0.002,
    (s, rng) => {
      const c = anyCompetitor(s, rng);
      return { title: `${c?.name ?? "A rival"} stumbles`, detail: pick(rng, ["Their flagship launch slipped two quarters.", "A botched migration has their customers shopping around.", "Key staff are leaving them in waves."]) + " Their customers are calling.", fx: { demand: 5, reputation: 1 } };
    }),
  d("churn-spike", "market", "market", "warn", 40, 60,
    (s) => (s.metrics.customerSat < 45 ? 0.006 : 0.001),
    () => ({ title: "Churn spikes", detail: "Unhappy customers are leaving faster than sales can replace them.", fx: { demand: -5, reputation: -4, customerSat: -3 } })),
  d("conference-buzz", "market", "market", "good", 70, 120,
    (s) => (s.metrics.innovation > 55 ? 0.0025 : 0.0008),
    () => ({ title: "Conference keynote lands", detail: "The demo drew a standing crowd; the clip is doing numbers.", fx: { demand: 4, reputation: 3 } })),
  d("procurement-freeze", "market", "market", "warn", 80, 140,
    (s) => (s.world.economy < -20 ? 0.0035 : 0.0006),
    () => ({ title: "Enterprise buying freezes", detail: "CFOs downstream are sitting on signatures until the macro clears.", fx: { demand: -5 } })),
  d("partnership", "market", "market", "good", 50, 100,
    (s) => (s.metrics.reputation > 55 ? 0.003 : 0.001),
    (s) => ({ title: "Distribution partnership signed", detail: "A larger platform will carry the product to its customer base — with an advance.", fx: { demand: 6, cash: cashPct(s, 0.04) } })),
];

// ── FINANCE ──────────────────────────────────────────────────────────────────

const FINANCE: EventDef[] = [
  d("grant", "market", "finance", "good", 60, 200,
    (s) => (s.config.industry === "biotech" || s.config.industry === "manufacturing" ? 0.002 : 0.0006),
    (s) => ({ title: "Government grant awarded", detail: "Non-dilutive funding for the research programme cleared review.", fx: { cash: cashPct(s, 0.05), innovation: 2 } })),
  d("tax-audit", "market", "finance", "warn", 120, 240,
    () => 0.001,
    (s) => ({ title: "Tax authority opens audit", detail: "Three years of books under review. Finance is consumed for a quarter.", fx: { cash: -cashPct(s, 0.015), risk: 4, morale: -1 } })),
  d("invoice-default", "market", "finance", "warn", 60, 90,
    (s) => (s.world.economy < -25 ? 0.0035 : 0.001),
    (s) => ({ title: "Major invoice defaults", detail: "A customer went under owing a quarter's billings. Write-off booked.", fx: { cash: -revDays(s, 15), risk: 3 } })),
  d("credit-line", "market", "finance", "good", 90, 200,
    (s) => (s.metrics.growth > 5 && s.metrics.risk < 40 ? 0.002 : 0.0004),
    () => ({ title: "Credit line secured", detail: "A bank facility on good terms extends the safety margin.", fx: { risk: -6 } })),
  d("fraud-caught", "market", "finance", "warn", 100, 220,
    () => 0.0008,
    (s) => ({ title: "Payment fraud caught in the act", detail: "Controls flagged an invoice-diversion scheme before the wire went out. Losses contained.", fx: { cash: -cashPct(s, 0.005), risk: 2, reputation: 1 } })),
  d("insurance-spike", "market", "finance", "info", 150, 300,
    (s) => (s.metrics.risk > 50 ? 0.0018 : 0.0004),
    () => ({ title: "Insurance premiums jump", detail: "Underwriters repriced the org's risk profile. Overhead creeps up.", fx: { cash: -20000, risk: 1 } })),
  d("funding-interest", "market", "finance", "good", 120, 250,
    (s) => (s.metrics.growth > 12 ? 0.0025 : 0.0003),
    () => ({ title: "Term sheet lands unsolicited", detail: "Growth metrics attracted a serious investor. Optionality, even if declined.", fx: { reputation: 4, risk: -3, morale: 2 } })),
];

// ── WORLD / MACRO ────────────────────────────────────────────────────────────

const WORLD: EventDef[] = [
  d("market-crash", "macro", "world", "critical", 60, 180,
    (s) => (s.world.economy < -35 ? 0.006 : 0.0002),
    (s) => ({ title: "Markets crash", detail: "A broad downturn hits. Demand contracts, valuations fall, risk jumps.", fx: { demand: -12, cash: -cashPct(s, 0.03), risk: 10 } })),
  d("boom-tailwind", "macro", "world", "good", 40, 150,
    (s) => (s.world.economy > 35 ? 0.005 : 0.0003),
    () => ({ title: "Sector boom", detail: "Capital and attention flood the sector. Rising tide, for now.", fx: { demand: 8, reputation: 2 } })),
  d("rate-hike", "macro", "world", "warn", 80, 160,
    (s) => (s.world.economy < 0 ? 0.0025 : 0.0008),
    () => ({ title: "Central bank hikes rates", detail: "Money got more expensive. Buyers stretch payment terms; capital tightens.", fx: { demand: -3, risk: 3 } })),
  d("rate-cut", "macro", "world", "good", 80, 160,
    (s) => (s.world.economy < -20 ? 0.0025 : 0.0006),
    () => ({ title: "Central bank cuts rates", detail: "Cheaper money loosens budgets downstream.", fx: { demand: 3, risk: -2 } })),
  d("tariffs", "macro", "world", "warn", 100, 220,
    (s) => (s.config.industry === "manufacturing" || s.config.industry === "retail" ? 0.0025 : 0.0006),
    () => ({ title: "New tariffs bite", detail: "Trade policy shifted overnight; input costs and paperwork both rise.", fx: { cash: -30000, demand: -2, risk: 2 } })),
  d("talent-shortage", "macro", "people", "warn", 60, 120,
    () => 0.0015,
    () => ({ title: "Talent market tightens", detail: "Hiring gets harder and pricier across the sector; wage pressure builds.", fx: { morale: -3, risk: 3 } })),
  d("industry-scandal", "macro", "world", "warn", 90, 200,
    () => 0.0012,
    (s) => ({ title: "Industry-wide scandal", detail: `A rival's misconduct dominates headlines; trust in the whole ${s.config.industry} category dips.`, fx: { demand: -3, reputation: -2 } })),
  d("tech-shift", "macro", "world", "info", 120, 240,
    () => 0.0015,
    () => ({ title: "Platform shift announced", detail: "A technology transition is coming. Threat for the slow, opening for the quick.", fx: { innovation: 2, risk: 3 } })),
  d("election-fog", "macro", "world", "info", 150, 300,
    () => 0.001,
    () => ({ title: "Election-year fog", detail: "Policy uncertainty has buyers hedging until the outcome is clear.", fx: { demand: -2, risk: 2 } })),
];

// ── DISASTERS (black swans; gated by ruleset.events.disastersEnabled) ────────

const DISASTERS: EventDef[] = [
  d("data-breach", "disaster", "world", "critical", 90, 240,
    (s) => 0.0009 + (s.metrics.techDebt > 60 ? 0.0015 : 0),
    (s) => ({ title: "Data breach disclosed", detail: "A security incident goes public. Regulators notified; customers furious; forensics engaged.", fx: { reputation: -12, customerSat: -8, cash: -cashPct(s, 0.05), risk: 14 } })),
  d("lawsuit", "disaster", "finance", "critical", 90, 220,
    () => 0.0008,
    (s) => ({ title: "Major lawsuit filed", detail: "Litigation lands. Legal costs bite immediately; the outcome hangs over everything.", fx: { cash: -cashPct(s, 0.06), risk: 10, reputation: -4 } })),
  d("product-recall", "disaster", "product", "critical", 120, 220,
    (s) => (s.metrics.techDebt > 55 ? 0.0016 : 0.0004),
    (s) => ({ title: "Forced product recall", detail: "A serious defect shipped. Remediation is costly and public.", fx: { reputation: -9, customerSat: -10, cash: -cashPct(s, 0.04), techDebt: -6 } })),
  d("major-outage", "disaster", "product", "warn", 60, 100,
    (s) => (s.metrics.techDebt > 50 ? 0.002 : 0.0005),
    () => ({ title: "Major outage", detail: "Hours of downtime at the worst moment. Status page went viral for the wrong reasons.", fx: { customerSat: -7, reputation: -3 } })),
  d("ransomware", "disaster", "world", "critical", 150, 300,
    (s) => (s.metrics.techDebt > 65 ? 0.0012 : 0.0003),
    (s) => ({ title: "Ransomware attack", detail: "Systems locked; operations on paper for days. Paying was refused; recovery is slow.", fx: { cash: -cashPct(s, 0.03), customerSat: -6, morale: -4, risk: 8 } })),
  d("office-disaster", "disaster", "world", "warn", 120, 300,
    () => 0.0006,
    (s, rng) => ({ title: pick(rng, ["Flood hits headquarters", "Earthquake shakes the region", "Fire in the building"]), detail: "Facilities damaged; teams scattered to remote work while repairs run.", fx: { cash: -cashPct(s, 0.02), morale: -3 } })),
  d("founder-scandal", "disaster", "people", "critical", 200, 400,
    (s) => ((s.agents.executives.find((x) => x.role === "CEO")?.traits.ego ?? 50) > 70 ? 0.0008 : 0.0002),
    (s, rng) => {
      const ceo = s.agents.executives.find((x) => x.role === "CEO");
      return { title: "CEO scandal breaks", detail: `${ceo?.name ?? "The CEO"}'s ${pick(rng, ["expense records", "old interview", "side venture"])} is front-page news. The board is in session.`, fx: { reputation: -10, morale: -5, risk: 8 } };
    }),
  d("acquisition-offer", "disaster", "finance", "good", 180, 300,
    (s) => (s.metrics.reputation > 60 && s.metrics.growth > 5 ? 0.0015 : 0.0002),
    () => ({ title: "Acquisition interest", detail: "A larger player is circling with a serious number. Validation — and a distraction.", fx: { reputation: 6, demand: 3 } })),
];

export const EVENTS: EventDef[] = [...PEOPLE, ...PRODUCT, ...MARKET, ...FINANCE, ...WORLD, ...DISASTERS];

/** Roll the registry for this tick. Returns fired events, their effects, and updated cooldowns. */
export function rollEvents(
  state: OrgState,
  rng: Rng,
  day: number,
  date: string,
  R: Ruleset,
): { events: OrgEvent[]; fx: EventFx[]; cooldowns: Record<string, number> } {
  const cooldowns = { ...(state.cooldowns ?? {}) };
  const out: OrgEvent[] = [];
  const fx: EventFx[] = [];
  let fired = 0;

  for (const def of EVENTS) {
    if (fired >= 2) break; // at most a couple of shocks per day
    if (day < def.minDay) continue;
    if (def.cls === "disaster" && !R.events.disastersEnabled) continue;
    const last = cooldowns[def.id];
    if (last !== undefined && day - last < def.cooldown) continue;

    const p = def.chance(state) * R.events.frequency;
    if (!rng.chance(p)) continue;

    const { title, detail, fx: f } = def.apply(state, rng);
    out.push({ day, date, kind: def.kind, severity: def.severity, title, detail });
    fx.push(f);
    cooldowns[def.id] = day;
    fired++;
  }

  return { events: out, fx, cooldowns };
}
