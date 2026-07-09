"use client";

import type { Driver } from "@athena/engine";
import { currency } from "@/lib/format";

/**
 * Causal attribution — the model's own terms for why each metric is moving
 * TODAY. Bars are signed contributions from the current tick: green pushes the
 * metric in its healthy direction, crimson pushes it the harmful way (so a
 * positive tech-debt driver reads red). This is the difference between a
 * number that moves and a model you can interrogate.
 */

const METRICS: Array<{ key: Driver["metric"]; label: string; inverse?: boolean; money?: boolean }> = [
  { key: "cash", label: "Cash", money: true },
  { key: "demand", label: "Demand" },
  { key: "morale", label: "Morale" },
  { key: "innovation", label: "Innovation" },
  { key: "techDebt", label: "Tech debt", inverse: true },
  { key: "risk", label: "Risk", inverse: true },
];

export function DriversPanel({ drivers }: { drivers: Driver[] }) {
  if (!drivers?.length) {
    return <p className="label py-6 text-center">ATTRIBUTION BEGINS ON THE FIRST TICK</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-px bg-[var(--color-grid)] sm:grid-cols-2 xl:grid-cols-3">
      {METRICS.map((mdef) => {
        const rows = drivers.filter((dr) => dr.metric === mdef.key);
        if (!rows.length) return null;
        const max = Math.max(...rows.map((r) => Math.abs(r.amount)), 1e-6);
        const net = rows.reduce((s, r) => s + r.amount, 0);
        const netGood = mdef.inverse ? net < 0 : net >= 0;
        return (
          <div key={mdef.key} className="bg-[var(--color-panel)] px-4 py-3.5">
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="label">{mdef.label}</span>
              <span
                className="mono text-[0.62rem] tabular"
                style={{ color: netGood ? "var(--color-good)" : "var(--color-phosphor)" }}
              >
                Σ {mdef.money ? currency(net) : (net >= 0 ? "+" : "") + net.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {rows.map((r) => {
                const harmful = mdef.inverse ? r.amount > 0 : r.amount < 0;
                const w = (Math.abs(r.amount) / max) * 100;
                return (
                  <div key={r.source} className="flex items-center gap-2">
                    <span className="mono w-[11ch] shrink-0 truncate text-[0.6rem] text-[var(--color-muted)]">
                      {r.source}
                    </span>
                    {/* signed bar: grows left for negative, right for positive */}
                    <div className="relative h-[6px] flex-1">
                      <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--color-grid-2)]" />
                      <span
                        className="absolute inset-y-[2px]"
                        style={{
                          left: r.amount < 0 ? `${50 - w / 2}%` : "50%",
                          width: `${w / 2}%`,
                          background: harmful ? "var(--color-phosphor)" : "var(--color-good)",
                          opacity: 0.9,
                        }}
                      />
                    </div>
                    <span className="mono w-[8ch] shrink-0 text-right text-[0.58rem] tabular text-[var(--color-ash-2)]">
                      {mdef.money ? currency(r.amount) : (r.amount >= 0 ? "+" : "") + r.amount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
