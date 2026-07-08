import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceBy, createOrganization, type SimConfig } from "../src/index";

const CONFIG: SimConfig = {
  seed: 42,
  name: "Testco",
  industry: "software",
  initialCapital: 500_000,
  philosophy: "innovation",
  size: "startup",
  growthStrategy: "aggressive",
  riskAppetite: "balanced",
  departments: ["engineering", "sales", "operations"],
  startDate: "2026-01-01",
};

test("a fresh organization is born alive at day 0", () => {
  const org = createOrganization(CONFIG);
  assert.equal(org.day, 0);
  assert.equal(org.status, "alive");
  assert.equal(org.metrics.cash, 500_000);
  assert.ok(org.agents.departments.length === 3);
  assert.equal(org.log.length, 1); // the founding event
});

test("an org is born populated with interacting agents", () => {
  const org = createOrganization(CONFIG);
  assert.ok(org.agents.executives.length >= 3, "has a leadership team");
  assert.ok(org.agents.executives.some((x) => x.role === "CEO"));
  assert.ok(org.agents.employees.length > 0, "has a notable roster");
  assert.ok(org.agents.projects.length > 0, "has initial projects");
  // headcount is the sum of its departments
  const sum = org.agents.departments.reduce((s, d) => s + d.headcount, 0);
  assert.equal(org.metrics.headcount, sum);
});

test("metrics emerge: agents change as the world runs", () => {
  const start = createOrganization(CONFIG);
  const after = advanceBy(start, 120).state;
  // projects should have made progress or shipped over 120 days
  const shipped = after.agents.projects.filter((p) => p.status === "shipped").length;
  const moved = after.agents.projects.some((p) => p.progress > 0);
  assert.ok(shipped > 0 || moved, "projects advance over time");
  assert.notEqual(after.metrics.innovation, start.metrics.innovation);
});

test("determinism: same seed ⇒ byte-identical 365-day history", () => {
  const a = advanceBy(createOrganization(CONFIG), 365).state;
  const b = advanceBy(createOrganization(CONFIG), 365).state;
  assert.deepEqual(a, b);
});

test("determinism: different seed ⇒ divergent history", () => {
  const a = advanceBy(createOrganization(CONFIG), 200).state;
  const b = advanceBy(createOrganization({ ...CONFIG, seed: 7 }), 200).state;
  assert.notDeepEqual(a.metrics, b.metrics);
});

test("time advances one calendar day per tick", () => {
  const r = advanceBy(createOrganization(CONFIG), 31);
  assert.equal(r.state.day, 31);
  assert.equal(r.state.date, "2026-02-01");
});

test("the world narrates: events accumulate over a year", () => {
  const r = advanceBy(createOrganization(CONFIG), 365);
  assert.ok(r.events.length > 0, "expected the world to emit events");
});

test("the external world exists and evolves", () => {
  const start = createOrganization(CONFIG);
  assert.ok(start.world.competitors.length > 0, "born with competitors");
  const after = advanceBy(start, 200).state;
  assert.notEqual(after.world.economy, start.world.economy, "economy moves");
  assert.ok(after.world.regulation >= start.world.regulation, "regulation only rises");
});

test("orchestration holds board reviews and can change the directive", () => {
  const r = advanceBy(createOrganization(CONFIG), 300);
  const boardEvents = r.events.filter((e) => e.kind === "board");
  assert.ok(boardEvents.length > 0, "board reviews fire on a cadence");
  assert.ok(boardEvents.some((e) => /board review/i.test(e.title)), "quarterly reviews occur");
});
