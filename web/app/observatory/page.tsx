"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { OrgState, SimConfig } from "@athena/engine";
import { useSimulation } from "@/lib/useSimulation";
import { clearWorld, loadConfig, loadWorld, randomSeed } from "@/lib/world";
import { SimHeader } from "@/components/SimHeader";
import { VitalSigns } from "@/components/VitalSigns";
import { OrgTopology } from "@/components/OrgTopology";
import { WorldPanel } from "@/components/WorldPanel";
import { EventFeed } from "@/components/EventFeed";
import { Sparkline } from "@/components/Sparkline";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { currency, signedPct } from "@/lib/format";

export default function ObservatoryRoute() {
  // Resolve the world on the client (avoids SSR/hydration mismatch on the static
  // export): resume the saved world if it belongs to the current company,
  // otherwise boot a fresh one from the created config.
  const [boot, setBoot] = useState<{ config: SimConfig; resume: OrgState | null } | null>(null);
  useEffect(() => {
    const config = loadConfig();
    const saved = loadWorld();
    const current =
      saved &&
      saved.world &&
      saved.directive &&
      saved.cooldowns &&
      saved.agents?.executives?.every((e) => !!e.traits) &&
      saved.config.seed === config.seed &&
      saved.config.name === config.name;
    setBoot({ config, resume: current ? saved : null });
  }, []);

  if (!boot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="label pulse">BOOTING ORGANIZATION…</span>
      </div>
    );
  }
  return <Observatory config={boot.config} resume={boot.resume} />;
}

function Observatory({ config, resume }: { config: SimConfig; resume: OrgState | null }) {
  const seedRef = useRef(config.seed);
  const [view, setView] = useState<"vitals" | "topology" | "world">("vitals");
  const sim = useSimulation(config, resume);
  const { state, history } = sim;
  const m = state.metrics;

  const cashSeries = useMemo(() => history.map((h) => h.cash), [history]);
  const revSeries = useMemo(() => history.map((h) => h.revenue), [history]);
  const expSeries = useMemo(() => history.map((h) => h.expenses), [history]);

  const net = m.revenue - m.expenses;
  const runway = net < 0 ? m.cash / -net : Infinity;

  // Reset re-runs the SAME company with a fresh seed — a different plausible life.
  const handleReset = () => {
    seedRef.current = randomSeed();
    sim.reset({ ...config, seed: seedRef.current });
  };

  return (
    <div className="min-h-screen">
      <SimHeader
        state={state}
        speed={sim.speed}
        running={sim.running}
        onSpeed={sim.setSpeed}
        onStep={sim.step}
        onReset={handleReset}
      />

      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-5 py-2 md:px-8">
        <Link href="/create" className="glitch label shrink-0 hover:text-[var(--color-phosphor)]">
          ← NEW COMPANY
        </Link>
        <span className="label hidden truncate md:inline">
          DIRECTIVE · <span className="text-[var(--color-phosphor)]">{state.directive.label}</span>
        </span>
        <span className="label hidden shrink-0 sm:inline">
          SEED {state.config.seed} · {state.config.industry.toUpperCase()}
        </span>
      </div>

      <main className="mx-auto grid max-w-[1360px] grid-cols-1 gap-px bg-[var(--color-grid)] lg:grid-cols-[1.9fr_1fr]">
        <section className="bg-[var(--color-void)]">
          <div className="bracket relative overflow-hidden border-b border-[var(--color-grid)] px-5 py-7 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="label mb-2">Treasury · Cash on hand</div>
                <AnimatedNumber
                  value={m.cash}
                  format={currency}
                  className="mono block text-5xl font-bold tracking-tighter tabular text-[var(--color-ash)] md:text-6xl"
                />
                <div className="mono mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[0.68rem] text-[var(--color-muted)]">
                  <span>
                    NET/DAY{" "}
                    <span style={{ color: net >= 0 ? "var(--color-ash)" : "var(--color-phosphor)" }}>
                      {net >= 0 ? "+" : ""}
                      {currency(net)}
                    </span>
                  </span>
                  <span>
                    RUNWAY{" "}
                    <span className="text-[var(--color-ash-2)]">
                      {Number.isFinite(runway) ? `${Math.max(0, Math.round(runway))}D` : "∞"}
                    </span>
                  </span>
                  <span>
                    GROWTH{" "}
                    <span style={{ color: m.growth >= 0 ? "var(--color-ash)" : "var(--color-phosphor)" }}>
                      {signedPct(m.growth)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="pointer-events-none mt-5 h-16 opacity-90">
              <Sparkline points={cashSeries} color="var(--color-phosphor)" width={640} height={64} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-[var(--color-grid)] bg-[var(--color-grid)]">
            <Flow label="Revenue / day" value={m.revenue} series={revSeries} />
            <Flow label="Expenses / day" value={m.expenses} series={expSeries} />
          </div>

          <div className="px-5 pb-8 pt-6 md:px-8">
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <button className="gbtn" data-active={view === "vitals"} onClick={() => setView("vitals")}>
                Vital signs
              </button>
              <button className="gbtn" data-active={view === "topology"} onClick={() => setView("topology")}>
                Org topology
              </button>
              <button className="gbtn" data-active={view === "world"} onClick={() => setView("world")}>
                World
              </button>
              {view === "topology" && (
                <span className="label ml-auto hidden sm:inline">
                  {state.agents.departments.length} DEPTS · {state.agents.projects.filter((p) => p.status !== "shipped").length} LIVE PROJECTS
                </span>
              )}
            </div>
            {view === "vitals" && (
              <>
                <VitalSigns metrics={m} />
                <p className="mt-4 max-w-[74ch] text-[0.78rem] leading-relaxed text-[var(--color-muted)]">
                  No single KPI defines success. These co-evolve — cash pressures morale, tech debt
                  erodes customer satisfaction, reputation feeds demand. The Phosphor marks critical state.
                </p>
              </>
            )}
            {view === "topology" && (
              <div className="border border-[var(--color-grid)] bg-[var(--color-void)]">
                <OrgTopology agents={state.agents} />
              </div>
            )}
            {view === "world" && <WorldPanel world={state.world} directive={state.directive} />}
          </div>
        </section>

        <aside className="flex flex-col bg-[var(--color-void)]">
          <div className="sticky top-[57px] z-10 flex items-center justify-between border-b border-[var(--color-grid)] bg-[var(--color-void)] px-4 py-3">
            <span className="label">World feed</span>
            <span className="mono text-[0.6rem] text-[var(--color-faint)]">{state.log.length} EVENTS</span>
          </div>
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <EventFeed events={state.log} />
          </div>
        </aside>
      </main>
    </div>
  );
}

function Flow({ label, value, series }: { label: string; value: number; series: number[] }) {
  return (
    <div className="relative overflow-hidden bg-[var(--color-panel)] px-5 py-4 md:px-8">
      <div className="label mb-1.5">{label}</div>
      <AnimatedNumber
        value={value}
        format={currency}
        className="mono text-3xl font-bold tracking-tight tabular text-[var(--color-ash)]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 opacity-50">
        <Sparkline points={series} color="var(--color-ash-2)" width={320} height={40} />
      </div>
    </div>
  );
}
