"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { DEFAULT_CONFIG, useSimulation } from "@/lib/useSimulation";
import { SimHeader } from "@/components/SimHeader";
import { VitalSigns } from "@/components/VitalSigns";
import { EventFeed } from "@/components/EventFeed";
import { Sparkline } from "@/components/Sparkline";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { currency, signedPct } from "@/lib/format";

export default function Observatory() {
  const seedRef = useRef(DEFAULT_CONFIG.seed);
  const sim = useSimulation(DEFAULT_CONFIG);
  const { state, history } = sim;
  const m = state.metrics;

  const cashSeries = useMemo(() => history.map((h) => h.cash), [history]);
  const revSeries = useMemo(() => history.map((h) => h.revenue), [history]);
  const expSeries = useMemo(() => history.map((h) => h.expenses), [history]);

  const net = m.revenue - m.expenses;
  const runway = net < 0 ? m.cash / -net : Infinity;

  const handleReset = () => {
    seedRef.current += 1;
    sim.reset({ ...DEFAULT_CONFIG, seed: seedRef.current });
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

      {/* coordinate strip */}
      <div className="mx-auto flex max-w-[1360px] items-center justify-between px-5 py-2 md:px-8">
        <Link href="/" className="glitch label hover:text-[var(--color-phosphor)]">
          ← ATHENA / ROOT
        </Link>
        <span className="label hidden sm:inline">
          OBSERVATORY · SEED {state.config.seed} · {state.config.industry.toUpperCase()}
        </span>
      </div>

      <main className="mx-auto grid max-w-[1360px] grid-cols-1 gap-px bg-[var(--color-grid)] lg:grid-cols-[1.9fr_1fr]">
        {/* ── main column ─────────────────────────────────────────────── */}
        <section className="bg-[var(--color-void)]">
          {/* Treasury */}
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

          {/* Flows */}
          <div className="grid grid-cols-2 gap-px border-b border-[var(--color-grid)] bg-[var(--color-grid)]">
            <Flow label="Revenue / day" value={m.revenue} series={revSeries} />
            <Flow label="Expenses / day" value={m.expenses} series={expSeries} />
          </div>

          {/* Vital signs */}
          <div className="px-5 pb-8 pt-6 md:px-8">
            <div className="label mb-3">Vital signs</div>
            <VitalSigns metrics={m} />
            <p className="mono mt-4 max-w-[74ch] text-[0.66rem] leading-relaxed text-[var(--color-faint)]">
              // NO SINGLE KPI DEFINES SUCCESS. THESE CO-EVOLVE — CASH PRESSURES MORALE, TECH DEBT
              ERODES CUSTOMER SATISFACTION, REPUTATION FEEDS DEMAND. THE PHOSPHOR MARKS CRITICAL STATE.
            </p>
          </div>
        </section>

        {/* ── world feed ──────────────────────────────────────────────── */}
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
