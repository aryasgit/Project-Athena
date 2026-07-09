"use client";

import type { Directive, WorldState } from "@athena/engine";
import type { HistoryPoint } from "@/lib/useSimulation";
import { Sparkline } from "./Sparkline";

/**
 * The external world the organization lives inside: the economic cycle,
 * sector sentiment, regulation, supply health, and the competitors pressing on
 * it — plus the board's standing directive. Each condition carries its recent
 * trend. Monotone HUD; The Phosphor marks adverse conditions.
 */
export function WorldPanel({
  world,
  directive,
  history,
}: {
  world: WorldState;
  directive: Directive;
  history?: HistoryPoint[];
}) {
  const recession = world.economy < -15;
  const climate = world.economy > 15 ? "BOOM" : world.economy < -15 ? "RECESSION" : "STABLE";
  const window_ = history && history.length > 2 ? history.slice(-180) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* board directive */}
      <div className="bracket border border-[var(--color-grid)] bg-[var(--color-panel)] px-5 py-4">
        <div className="label mb-1.5">Board directive</div>
        <div className="display text-xl tracking-tight text-[var(--color-phosphor)]">{directive.label}</div>
        <div className="mono mt-1 text-[0.6rem] uppercase tracking-widest text-[var(--color-faint)]">
          SET DAY {directive.sinceDay} · SELF-CORRECTS EACH QUARTER
        </div>
      </div>

      {/* economy cycle */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Economy · {climate}</span>
          <span className="mono text-[0.7rem] tabular" style={{ color: recession ? "var(--color-phosphor)" : "var(--color-ash)" }}>
            {world.economy >= 0 ? "+" : ""}{world.economy.toFixed(0)}
          </span>
        </div>
        <div className="relative h-[6px] w-full bg-[var(--color-grid-2)]">
          <div className="absolute left-1/2 top-[-3px] h-[12px] w-px bg-[var(--color-faint)]" />
          <div
            className="absolute top-0 h-full"
            style={{
              background: recession ? "var(--color-phosphor)" : "var(--color-ash)",
              left: world.economy >= 0 ? "50%" : `${50 + world.economy / 2}%`,
              width: `${Math.abs(world.economy) / 2}%`,
            }}
          />
        </div>
        {window_ && (
          <div className="pointer-events-none mt-2 h-10 opacity-70">
            <Sparkline
              points={window_.map((h) => h.economy)}
              color={recession ? "var(--color-phosphor)" : "var(--color-ash-2)"}
              width={420}
              height={40}
            />
          </div>
        )}
      </div>

      {/* environment stats */}
      <div className="grid grid-cols-3 gap-px bg-[var(--color-grid)]">
        <Stat label="Sentiment" value={world.sentiment} trend={window_?.map((h) => h.sentiment)} />
        <Stat label="Regulation" value={world.regulation} danger={world.regulation > 60} suffix="burden" trend={window_?.map((h) => h.regulation)} />
        <Stat label="Supply" value={world.supply} danger={world.supply < 60} trend={window_?.map((h) => h.supply)} />
      </div>

      {/* competitors */}
      <div>
        <div className="label mb-2">Competitors · {world.competitors.length}</div>
        <div className="flex flex-col gap-px bg-[var(--color-grid)]">
          {world.competitors.map((c) => {
            const strong = c.strength > 65;
            return (
              <div key={c.id} className="flex items-center gap-3 bg-[var(--color-panel)] px-4 py-2.5">
                <span className="mono w-[16ch] shrink-0 truncate text-[0.78rem]" style={{ color: strong ? "var(--color-phosphor)" : "var(--color-ash)" }}>
                  {c.name}
                </span>
                <div className="h-[2px] flex-1 bg-[var(--color-grid-2)]">
                  <div className="h-full" style={{ width: `${c.strength}%`, background: strong ? "var(--color-phosphor)" : "var(--color-ash-2)" }} />
                </div>
                <span className="mono w-[3ch] shrink-0 text-right text-[0.62rem] tabular text-[var(--color-muted)]" title="Market strength">
                  {c.strength.toFixed(0)}
                </span>
                <span
                  className="mono w-[7ch] shrink-0 text-right text-[0.55rem] uppercase tracking-wider"
                  style={{ color: c.aggression > 55 ? "var(--color-phosphor)" : "var(--color-faint)" }}
                  title={`Aggression ${c.aggression.toFixed(0)} — how often they make offensive moves`}
                >
                  {c.aggression > 55 ? "HOSTILE" : "DORMANT"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
  suffix,
  trend,
}: {
  label: string;
  value: number;
  danger?: boolean;
  suffix?: string;
  trend?: number[];
}) {
  return (
    <div className="bg-[var(--color-panel)] px-4 py-3">
      <div className="label mb-1.5">{label}</div>
      <div className="mono text-2xl font-semibold tabular" style={{ color: danger ? "var(--color-phosphor)" : "var(--color-ash)" }}>
        {value.toFixed(0)}
      </div>
      {suffix && <div className="mono text-[0.55rem] uppercase tracking-wider text-[var(--color-faint)]">{suffix}</div>}
      <div className="mt-2 h-[2px] w-full bg-[var(--color-grid-2)]">
        <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: danger ? "var(--color-phosphor)" : "var(--color-ash-2)" }} />
      </div>
      {trend && trend.length > 2 && (
        <div className="pointer-events-none mt-2 h-6 opacity-60">
          <Sparkline points={trend} color={danger ? "var(--color-phosphor)" : "var(--color-ash-2)"} width={140} height={24} />
        </div>
      )}
    </div>
  );
}
