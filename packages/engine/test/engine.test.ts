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
