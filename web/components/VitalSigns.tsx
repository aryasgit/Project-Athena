"use client";

import { useMemo } from "react";
import type { Metrics } from "@athena/engine";
import type { HistoryPoint } from "@/lib/useSimulation";
import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "./Sparkline";
import { integer, score } from "@/lib/format";

/**
 * The organization's vital signs — now each cell carries its own recent trend,
 * so a number is never just a number: you see where it's been heading. Signal
 * over noise: ash by default; The Phosphor ignites only in a danger band.
 */

type Vital = {
  key: keyof Metrics & keyof HistoryPoint;
  label: string;
  danger: (v: number) => boolean;
  /** one-line explanation of what feeds this metric */
  help: string;
};

const VITALS: Vital[] = [
  { key: "morale", label: "Morale", danger: (v) => v < 40, help: "People focus lifts it; runway pressure and overwork drain it. Below 40, people start leaving." },
  { key: "demand", label: "Demand", danger: (v) => v < 30, help: "Market appetite — moved by the economy, reputation, go-to-market strength and rivals." },
  { key: "innovation", label: "Innovation", danger: (v) => v < 30, help: "Product edge — shipped projects lift it; tech debt drags it down." },
  { key: "reputation", label: "Reputation", danger: (v) => v < 25, help: "Brand standing — follows customer satisfaction slowly; ships and scandals move it fast." },
  { key: "customerSat", label: "Customer Sat", danger: (v) => v < 35, help: "How customers feel — fed by innovation, eroded by tech debt and outages." },
  { key: "techDebt", label: "Tech Debt", danger: (v) => v > 70, help: "Accumulated shortcuts — grows with pace and stalls; erodes satisfaction and raises risk." },
  { key: "risk", label: "Risk", danger: (v) => v > 60, help: "Fragility — scored from debt, runway, morale, stalled work and world pressure." },
];

const TREND_WINDOW = 120;

export function VitalSigns({ metrics, history }: { metrics: Metrics; history?: HistoryPoint[] }) {
  const window_ = useMemo(
    () => (history && history.length > 2 ? history.slice(-TREND_WINDOW) : null),
    [history],
  );

  return (
    <div className="grid grid-cols-2 gap-px bg-[var(--color-grid)] sm:grid-cols-3 lg:grid-cols-4">
      <Cell label="Headcount" help="Total people — hiring needs healthy runway; low morale causes attrition.">
        <AnimatedNumber
          value={metrics.headcount}
          format={integer}
          className="mono text-2xl font-semibold tabular text-[var(--color-ash)]"
        />
        {window_ && <Trend points={window_.map((h) => h.headcount)} />}
      </Cell>
      {VITALS.map((v) => {
        const value = metrics[v.key] as number;
        const bad = v.danger(value);
        return (
          <Cell key={v.key} label={v.label} danger={bad} help={v.help}>
            <AnimatedNumber value={value} format={score} className="mono text-2xl font-semibold tabular" />
            <span className="mono ml-1 text-[0.55rem] text-[var(--color-faint)]">/100</span>
            <Meter value={value} danger={bad} />
            {window_ && <Trend points={window_.map((h) => h[v.key] as number)} danger={bad} />}
          </Cell>
        );
      })}
    </div>
  );
}

function Cell({
  label,
  danger,
  help,
  children,
}: {
  label: string;
  danger?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative bg-[var(--color-panel)] px-4 py-3.5"
      style={danger ? { color: "var(--color-phosphor)" } : { color: "var(--color-ash)" }}
      title={help}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2.5 w-[2px]"
          style={{ background: danger ? "var(--color-phosphor)" : "var(--color-grid-2)" }}
          aria-hidden
        />
        <span className="label" style={danger ? { color: "var(--color-phosphor)" } : undefined}>
          {label}
        </span>
        {danger && <span className="mono ml-auto text-[0.55rem] text-[var(--color-phosphor)]">! CRIT</span>}
      </div>
      <div className="flex flex-wrap items-baseline">{children}</div>
    </div>
  );
}

function Trend({ points, danger }: { points: number[]; danger?: boolean }) {
  return (
    <div className="pointer-events-none mt-2 h-6 w-full basis-full opacity-60">
      <Sparkline points={points} color={danger ? "var(--color-phosphor)" : "var(--color-ash-2)"} width={220} height={24} />
    </div>
  );
}

function Meter({ value, danger }: { value: number; danger?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-2.5 h-[2px] w-full basis-full bg-[var(--color-grid-2)]">
      <div
        className="h-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: danger ? "var(--color-phosphor)" : "var(--color-ash-2)" }}
      />
    </div>
  );
}
