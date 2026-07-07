"use client";

import type { Metrics } from "@athena/engine";
import { AnimatedNumber } from "./AnimatedNumber";
import { integer, score } from "@/lib/format";

/**
 * The organization's vital signs, as a monotone instrument panel. Signal over
 * noise: every score is ash by default; The Phosphor ignites only when a metric
 * crosses into a critical band — so colour always means "look here".
 */

type Vital = {
  key: keyof Metrics;
  label: string;
  /** returns true when this value is in a dangerous band */
  danger: (v: number) => boolean;
};

const VITALS: Vital[] = [
  { key: "morale", label: "Morale", danger: (v) => v < 40 },
  { key: "demand", label: "Demand", danger: (v) => v < 30 },
  { key: "innovation", label: "Innovation", danger: (v) => v < 30 },
  { key: "reputation", label: "Reputation", danger: (v) => v < 25 },
  { key: "customerSat", label: "Customer Sat", danger: (v) => v < 35 },
  { key: "techDebt", label: "Tech Debt", danger: (v) => v > 70 },
  { key: "risk", label: "Risk", danger: (v) => v > 60 },
];

export function VitalSigns({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid grid-cols-2 gap-px bg-[var(--color-grid)] sm:grid-cols-3 lg:grid-cols-4">
      <Cell label="Headcount">
        <AnimatedNumber
          value={metrics.headcount}
          format={integer}
          className="mono text-2xl font-semibold tabular text-[var(--color-ash)]"
        />
      </Cell>
      {VITALS.map((v) => {
        const value = metrics[v.key] as number;
        const bad = v.danger(value);
        return (
          <Cell key={v.key} label={v.label} danger={bad}>
            <AnimatedNumber
              value={value}
              format={score}
              className="mono text-2xl font-semibold tabular"
            />
            <span className="mono ml-1 text-[0.55rem] text-[var(--color-faint)]">/100</span>
            <Meter value={value} danger={bad} />
          </Cell>
        );
      })}
    </div>
  );
}

function Cell({
  label,
  danger,
  children,
}: {
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative bg-[var(--color-panel)] px-4 py-3.5" style={danger ? { color: "var(--color-phosphor)" } : { color: "var(--color-ash)" }}>
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
      <div className="flex items-baseline">{children}</div>
    </div>
  );
}

function Meter({ value, danger }: { value: number; danger?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-2.5 h-[2px] w-full bg-[var(--color-grid-2)]">
      <div
        className="h-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: danger ? "var(--color-phosphor)" : "var(--color-ash-2)" }}
      />
    </div>
  );
}
