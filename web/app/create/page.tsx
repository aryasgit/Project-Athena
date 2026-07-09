"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  DepartmentKind,
  GrowthStrategy,
  Industry,
  Philosophy,
  RiskAppetite,
  SimConfig,
  CompanySize,
} from "@athena/engine";
import { createOrganization, DEFAULT_RULESET, resolveRuleset, type Ruleset } from "@athena/engine";
import { GROUP_HELP, PARAM_FIELDS, SCENARIOS, type Scenario } from "@/lib/scenarios";
import { Slider } from "@/components/Slider";
import {
  CAPITAL_TIERS,
  DEFAULT_CONFIG,
  DEPARTMENTS,
  INDUSTRIES,
  PHILOSOPHIES,
  RISK,
  SIZES,
  STRATEGIES,
  Option,
  randomSeed,
  saveConfig,
  clearWorld,
} from "@/lib/world";
import { DecodeText } from "@/components/DecodeText";
import { currency } from "@/lib/format";

export default function CreateCompany() {
  const router = useRouter();
  const [name, setName] = useState("Meridian Systems");
  const [industry, setIndustry] = useState<Industry>("software");
  const [capital, setCapital] = useState<number>(1_500_000);
  const [philosophy, setPhilosophy] = useState<Philosophy>("innovation");
  const [size, setSize] = useState<CompanySize>("scaleup");
  const [strategy, setStrategy] = useState<GrowthStrategy>("aggressive");
  const [risk, setRisk] = useState<RiskAppetite>("balanced");
  const [departments, setDepartments] = useState<DepartmentKind[]>([
    "engineering",
    "sales",
    "marketing",
    "operations",
    "research",
  ]);
  const [seed, setSeed] = useState(DEFAULT_CONFIG.seed);
  const [ruleset, setRuleset] = useState<Ruleset>(DEFAULT_RULESET);
  const [scenarioId, setScenarioId] = useState("baseline");
  const [advanced, setAdvanced] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // randomise the seed on the client (never touches the engine's determinism)
  useEffect(() => setSeed(randomSeed()), []);

  const config: SimConfig = useMemo(
    () => ({
      seed,
      name: name.trim() || "Untitled Co.",
      industry,
      initialCapital: capital,
      philosophy,
      size,
      growthStrategy: strategy,
      riskAppetite: risk,
      departments,
      startDate: "2026-01-01",
      ruleset,
    }),
    [seed, name, industry, capital, philosophy, size, strategy, risk, departments, ruleset],
  );

  const applyScenario = (s: Scenario) => {
    setScenarioId(s.id);
    setRuleset(resolveRuleset(s.ruleset));
  };

  const exportScenario = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `athena-${(name.trim() || "scenario").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importScenario = (file: File) => {
    file.text().then((txt) => {
      try {
        const c = JSON.parse(txt) as Partial<SimConfig>;
        if (c.name) setName(c.name);
        if (c.industry) setIndustry(c.industry);
        if (c.initialCapital) setCapital(c.initialCapital);
        if (c.philosophy) setPhilosophy(c.philosophy);
        if (c.size) setSize(c.size);
        if (c.growthStrategy) setStrategy(c.growthStrategy);
        if (c.riskAppetite) setRisk(c.riskAppetite);
        if (c.departments?.length) setDepartments(c.departments);
        setRuleset(resolveRuleset(c.ruleset));
        setScenarioId("imported");
      } catch {
        /* ignore malformed files */
      }
    });
  };

  // a live preview of the day-0 org, so choices feel consequential
  const preview = useMemo(() => createOrganization(config), [config]);

  const canLaunch = departments.length > 0 && name.trim().length > 0;

  const launch = () => {
    if (!canLaunch) return;
    saveConfig(config);
    clearWorld(); // a new company starts fresh, not resumed from the last world
    router.push("/observatory");
  };

  const toggleDept = (d: DepartmentKind) =>
    setDepartments((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--color-grid)] bg-[color-mix(in_srgb,var(--color-void)_70%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3 md:px-8">
          <Link href="/" className="glitch display text-sm tracking-tight">
            ATHENA<span className="text-[var(--color-phosphor)]">.</span>
          </Link>
          <span className="label">CONFIGURE · NEW ORGANIZATION</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-px bg-[var(--color-grid)] pt-16 lg:grid-cols-[1.6fr_1fr]">
        {/* ── console ─────────────────────────────────────────────────── */}
        <section className="bg-[var(--color-void)] px-5 py-8 md:px-8">
          <DecodeText as="h1" text="CREATE COMPANY" className="display block text-3xl tracking-tighter md:text-4xl" />
          <p className="mt-3 max-w-[54ch] text-[0.9rem] leading-relaxed text-[var(--color-ash-2)]">
            Configure an organization, then press start. From that moment it evolves on its own —
            through thousands of interacting decisions. The seed makes the entire future reproducible.
          </p>

          <div className="mt-8 flex flex-col gap-7">
            <Field label="Company name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[var(--color-grid-2)] bg-transparent px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm text-[var(--color-ash)] outline-none transition-colors focus:border-[var(--color-phosphor)]"
                placeholder="Untitled Co."
                maxLength={40}
              />
            </Field>

            <Group label="Industry" options={INDUSTRIES} value={industry} onChange={setIndustry} />
            <Group label="Starting capital" options={CAPITAL_TIERS} value={capital} onChange={setCapital} />
            <Group label="Philosophy" options={PHILOSOPHIES} value={philosophy} onChange={setPhilosophy} showHint />
            <Group label="Company size" options={SIZES} value={size} onChange={setSize} showHint />
            <Group label="Growth strategy" options={STRATEGIES} value={strategy} onChange={setStrategy} showHint />
            <Group label="Risk appetite" options={RISK} value={risk} onChange={setRisk} />

            <Field label={`Departments · ${departments.length} selected`}>
              <div className="flex flex-wrap gap-1.5">
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d.value}
                    className="gbtn"
                    data-active={departments.includes(d.value)}
                    onClick={() => toggleDept(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Scenario · ruleset preset">
              <div className="flex flex-wrap gap-1.5">
                {SCENARIOS.map((s) => (
                  <button key={s.id} className="gbtn" data-active={scenarioId === s.id} onClick={() => applyScenario(s)} title={s.description}>
                    {s.name}
                  </button>
                ))}
              </div>
              <p className="mono mt-2 text-[0.66rem] text-[var(--color-muted)]">
                → {SCENARIOS.find((s) => s.id === scenarioId)?.description ?? "Custom ruleset (edited or imported)."}
              </p>
            </Field>

            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button className="gbtn" data-active={advanced} onClick={() => setAdvanced((a) => !a)}>
                  {advanced ? "▾" : "▸"} Advanced parameters
                </button>
                <button
                  className="gbtn"
                  data-active={ruleset.events.disastersEnabled}
                  onClick={() => setRuleset((r) => ({ ...r, events: { ...r.events, disastersEnabled: !r.events.disastersEnabled } }))}
                >
                  Disasters {ruleset.events.disastersEnabled ? "ON" : "OFF"}
                </button>
                <button className="gbtn" onClick={exportScenario} title="Download this scenario as JSON">↧ Export</button>
                <button className="gbtn" onClick={() => fileRef.current?.click()} title="Load a scenario JSON">↥ Import</button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && importScenario(e.target.files[0])}
                />
              </div>

              {advanced && (
                <div className="mt-4 border border-[var(--color-grid)] bg-[var(--color-panel)] p-4 md:p-5">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-grid)] pb-4">
                    <p className="mono max-w-[58ch] text-[0.64rem] leading-relaxed text-[var(--color-muted)]">
                      // A RUN = SEED + RULESET. EVERY KNOB BELOW IS A MODEL ASSUMPTION. HOVER A VALUE TO RESET IT;
                      EXPORT TO SAVE THE EXPERIMENT, IMPORT TO REPRODUCE ONE.
                    </p>
                    <button className="gbtn" onClick={() => setRuleset(DEFAULT_RULESET)}>↺ Reset all</button>
                  </div>
                  {Object.entries(
                    PARAM_FIELDS.reduce<Record<string, typeof PARAM_FIELDS>>((acc, fd) => {
                      (acc[fd.group] ??= []).push(fd);
                      return acc;
                    }, {}),
                  ).map(([group, fields]) => (
                    <div key={group} className="mb-7 last:mb-0">
                      <div className="label">{group}</div>
                      <p className="mono mb-2 mt-1 text-[0.64rem] leading-snug text-[var(--color-muted)]">{GROUP_HELP[group]}</p>
                      <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                        {fields.map((fd) => (
                          <Slider
                            key={fd.label}
                            label={fd.label}
                            help={fd.help}
                            unit={fd.unit}
                            value={fd.get(ruleset)}
                            def={fd.get(DEFAULT_RULESET)}
                            min={fd.min}
                            max={fd.max}
                            step={fd.step}
                            onChange={(v) => setRuleset((r) => fd.set(r, v))}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── live preview / launch ───────────────────────────────────── */}
        <aside className="bg-[var(--color-void)] px-5 py-8 md:px-6">
          <div className="sticky top-24">
            <div className="label mb-3">// DAY-0 PREVIEW</div>
            <div className="bracket border border-[var(--color-grid)] bg-[var(--color-panel)] p-5">
              <div className="display text-2xl tracking-tight">{config.name || "Untitled Co."}</div>
              <div className="mono mt-1 text-[0.62rem] uppercase tracking-widest text-[var(--color-muted)]">
                {config.industry} · {config.philosophy} · {config.size}
              </div>

              <dl className="mt-5 flex flex-col gap-px bg-[var(--color-grid)] text-sm">
                <Stat k="Cash" v={currency(preview.metrics.cash)} />
                <Stat k="Headcount" v={String(preview.metrics.headcount)} />
                <Stat k="Departments" v={String(preview.agents.departments.length)} />
                <Stat k="Leadership" v={`${preview.agents.executives.length} execs`} />
                <Stat k="Initial projects" v={String(preview.agents.projects.length)} />
                <Stat k="Morale" v={preview.metrics.morale.toFixed(0)} />
                <Stat k="Risk" v={preview.metrics.risk.toFixed(0)} />
              </dl>

              <div className="mono mt-4 flex items-center justify-between text-[0.62rem] text-[var(--color-muted)]">
                <span>SEED · {seed}</span>
                <button className="glitch hover:text-[var(--color-phosphor)]" onClick={() => setSeed(randomSeed())}>
                  ↻ REGENERATE
                </button>
              </div>
            </div>

            <button
              onClick={launch}
              disabled={!canLaunch}
              className="gbtn glitch mt-4 w-full justify-center py-3 text-[0.8rem]"
              data-active={canLaunch}
            >
              ▶ INITIALIZE SIMULATION
            </button>
            {!canLaunch && (
              <p className="mono mt-2 text-[0.62rem] text-[var(--color-phosphor)]">
                ! SELECT AT LEAST ONE DEPARTMENT AND NAME THE COMPANY
              </p>
            )}
            <Link href="/observatory" className="label mt-4 block hover:text-[var(--color-phosphor)]">
              → OR OBSERVE THE LAST WORLD
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-2.5">{label}</div>
      {children}
    </div>
  );
}

function Group<T extends string | number>({
  label,
  options,
  value,
  onChange,
  showHint,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  showHint?: boolean;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            className="gbtn"
            data-active={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {o.hint && !showHint && (
              <span className="ml-2 text-[0.55rem] text-[var(--color-faint)]">{o.hint}</span>
            )}
          </button>
        ))}
      </div>
      {showHint && active?.hint && (
        <p className="mono mt-2 text-[0.66rem] text-[var(--color-muted)]">→ {active.hint}</p>
      )}
    </Field>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between bg-[var(--color-panel)] px-3 py-2">
      <dt className="label">{k}</dt>
      <dd className="mono tabular text-[var(--color-ash)]">{v}</dd>
    </div>
  );
}
