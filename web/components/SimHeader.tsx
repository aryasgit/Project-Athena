"use client";

import type { OrgState } from "@athena/engine";
import type { Speed } from "@/lib/useSimulation";
import { longDate } from "@/lib/format";

const SPEED_ORDER: Speed[] = ["slow", "normal", "fast"];
const SPEED_LABEL: Record<Speed, string> = { pause: "❙❙", slow: "1×", normal: "2×", fast: "4×" };

// Monotone: The Phosphor marks the live/critical states only.
const STATUS: Record<OrgState["status"], { dot: string; label: string; live: boolean }> = {
  alive: { dot: "var(--color-phosphor)", label: "LIVE", live: true },
  paused: { dot: "var(--color-ash-2)", label: "PAUSED", live: false },
  terminated: { dot: "var(--color-phosphor)", label: "TERMINATED", live: false },
};

export function SimHeader({
  state,
  speed,
  running,
  onSpeed,
  onStep,
  onReset,
}: {
  state: OrgState;
  speed: Speed;
  running: boolean;
  onSpeed: (s: Speed) => void;
  onStep: () => void;
  onReset: () => void;
}) {
  const key = running ? "alive" : state.status === "terminated" ? "terminated" : "paused";
  const status = STATUS[key];
  const alive = state.status === "alive";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-grid)] bg-[color-mix(in_srgb,var(--color-void)_82%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 md:px-8">
        {/* wordmark */}
        <div className="flex items-baseline gap-3">
          <span className="glitch display text-lg tracking-tight">
            ATHENA<span className="text-[var(--color-phosphor)]">.</span>
          </span>
        </div>

        {/* company + clock */}
        <div className="flex items-center gap-4">
          <div className="leading-tight">
            <div className="mono text-sm font-medium text-[var(--color-ash)]">{state.config.name}</div>
            <div className="mono text-[0.6rem] uppercase tracking-wider text-[var(--color-muted)]">
              {longDate(state.date)} · DAY {state.day}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 ${status.live ? "pulse" : ""}`}
              style={{ background: status.dot }}
              aria-hidden
            />
            <span className="mono text-[0.6rem] font-semibold tracking-widest" style={{ color: status.dot }}>
              {status.label}
            </span>
          </div>
        </div>

        {/* transport */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            className="gbtn glitch"
            data-active={running}
            onClick={() => onSpeed(running ? "pause" : "normal")}
            disabled={!alive}
            aria-pressed={running}
          >
            {running ? "❙❙ PAUSE" : "▶ RUN"}
          </button>
          <button className="gbtn glitch" onClick={onStep} disabled={!alive || running} title="Advance one day">
            ⤳ STEP
          </button>
          <div className="mx-1 flex overflow-hidden border border-[var(--color-grid-2)]">
            {SPEED_ORDER.map((s) => (
              <button
                key={s}
                className="gbtn border-0"
                data-active={speed === s}
                onClick={() => onSpeed(s)}
                disabled={!alive}
              >
                {SPEED_LABEL[s]}
              </button>
            ))}
          </div>
          <button className="gbtn glitch" onClick={onReset} title="Restart the world">
            ↺ RESET
          </button>
        </div>
      </div>
    </header>
  );
}
