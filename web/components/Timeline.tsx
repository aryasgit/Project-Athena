"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { scaleLinear, type ScaleLinear } from "d3-scale";
import { line, area, curveLinear } from "d3-shape";
import type { HistoryPoint, Marker } from "@/lib/useSimulation";
import { currency } from "@/lib/format";

/**
 * The telemetry timeline — the analytical heart of the observatory.
 *
 * Four panels share one time axis: treasury, daily flows, the 0–100 vitals, and
 * the macro economy the org is riding. Every notable event is PINNED to the day
 * it fired, so cause reads against consequence (a crash flag sits over the cash
 * dip that follows it). A crosshair reads out every series at any day. This is
 * the difference between watching numbers move and studying a system.
 *
 * Pure React-rendered SVG; D3 supplies scales and path geometry only.
 */

const PAD_L = 56;
const PAD_R = 16;

interface VitalDef {
  key: keyof HistoryPoint;
  label: string;
  color: string;
  dash?: string;
}

const VITALS: VitalDef[] = [
  { key: "morale", label: "MORALE", color: "var(--color-ash-2)" },
  { key: "demand", label: "DEMAND", color: "var(--color-ash)" },
  { key: "innovation", label: "INNOVATION", color: "var(--color-ash-2)", dash: "6 3" },
  { key: "reputation", label: "REPUTATION", color: "var(--color-ash)", dash: "2 3" },
  { key: "customerSat", label: "CUST SAT", color: "var(--color-ash-2)", dash: "1 3" },
  { key: "techDebt", label: "TECH DEBT", color: "var(--color-phosphor)", dash: "6 3" },
  { key: "risk", label: "RISK", color: "var(--color-phosphor)" },
];

const MARKER_COLOR: Record<Marker["severity"], string> = {
  good: "var(--color-good)",
  warn: "var(--color-phosphor)",
  critical: "var(--color-phosphor)",
  info: "var(--color-ash-2)",
};

// panel heights
const H_TREASURY = 116;
const H_FLOWS = 104;
const H_VITALS = 140;
const H_ECON = 52;
const H_LANE = 20; // marker lane
const H_AXIS = 22;
const LABEL_H = 18; // per-panel label row

export function Timeline({ history, markers }: { history: HistoryPoint[]; markers: Marker[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState<number | null>(null); // hovered day
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(["morale", "demand", "techDebt", "risk"]),
  );

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setWidth(Math.max(360, el.clientWidth));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // panel y-offsets
  const yTre = LABEL_H;
  const yFlo = yTre + H_TREASURY + LABEL_H + 8;
  const yVit = yFlo + H_FLOWS + LABEL_H + 8;
  const yEco = yVit + H_VITALS + LABEL_H + 8;
  const yLane = yEco + H_ECON + 10;
  const totalH = yLane + H_LANE + H_AXIS;

  const first = history[0];
  const last = history[history.length - 1];

  const geo = useMemo(() => {
    if (history.length < 2) return null;
    const x = scaleLinear().domain([first.day, Math.max(last.day, first.day + 30)]).range([PAD_L, width - PAD_R]);

    const cashMin = Math.min(0, ...history.map((d) => d.cash));
    const cashMax = Math.max(1, ...history.map((d) => d.cash));
    const yCash = scaleLinear().domain([cashMin, cashMax]).nice(3).range([yTre + H_TREASURY, yTre]);

    const floMax = Math.max(1, ...history.map((d) => Math.max(d.revenue, d.expenses)));
    const yFlow = scaleLinear().domain([0, floMax]).nice(3).range([yFlo + H_FLOWS, yFlo]);

    const yV = scaleLinear().domain([0, 100]).range([yVit + H_VITALS, yVit]);
    const yE = scaleLinear().domain([-100, 100]).range([yEco + H_ECON, yEco]);

    const lx = (d: HistoryPoint) => x(d.day);
    const mkLine = (get: (d: HistoryPoint) => number, sy: ScaleLinear<number, number>) =>
      line<HistoryPoint>().x(lx).y((d) => sy(get(d))).curve(curveLinear)(history) ?? "";

    const cashArea =
      area<HistoryPoint>()
        .x(lx)
        .y0(yCash(Math.max(0, cashMin)))
        .y1((d) => yCash(d.cash))
        .curve(curveLinear)(history) ?? "";

    const econUp =
      area<HistoryPoint>().x(lx).y0(yE(0)).y1((d) => yE(Math.max(0, d.economy))).curve(curveLinear)(history) ?? "";
    const econDn =
      area<HistoryPoint>().x(lx).y0(yE(0)).y1((d) => yE(Math.min(0, d.economy))).curve(curveLinear)(history) ?? "";

    const vitalPaths = VITALS.filter((v) => enabled.has(v.key as string)).map((v) => ({
      ...v,
      d: mkLine((p) => p[v.key] as number, yV),
    }));

    return {
      x,
      yCash,
      yFlow,
      cashArea,
      cashLine: mkLine((d) => d.cash, yCash),
      revLine: mkLine((d) => d.revenue, yFlow),
      expLine: mkLine((d) => d.expenses, yFlow),
      econUp,
      econDn,
      econLine: mkLine((d) => d.economy, yE),
      vitalPaths,
      yE,
    };
  }, [history, width, enabled, first, last, yFlo, yVit, yEco, yTre]);

  if (!geo || history.length < 2) {
    return (
      <div ref={wrapRef} className="flex h-[300px] items-center justify-center border border-[var(--color-grid)]">
        <span className="label pulse">COLLECTING TELEMETRY…</span>
      </div>
    );
  }

  const hoverPoint =
    hover !== null ? history[Math.min(history.length - 1, Math.max(0, hover - first.day))] : null;
  const hoverEvents = hover !== null ? markers.filter((m) => m.day === hover) : [];
  const criticals = markers.filter((m) => m.severity === "critical" && m.day >= first.day);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const day = Math.round(geo.x.invert(e.clientX - rect.left));
    setHover(Math.max(first.day, Math.min(last.day, day)));
  };

  const tooltipLeft =
    hover !== null ? Math.min(geo.x(hover) + 14, width - 216) : 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* series toggles */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <LegendSwatch color="var(--color-ash)" label="CASH" fat />
        <LegendSwatch color="var(--color-good)" label="REVENUE" />
        <LegendSwatch color="var(--color-phosphor)" label="EXPENSES" />
        <span className="mx-1 h-3 w-px bg-[var(--color-grid-2)]" />
        {VITALS.map((v) => {
          const on = enabled.has(v.key as string);
          return (
            <button
              key={v.key as string}
              onClick={() =>
                setEnabled((s) => {
                  const n = new Set(s);
                  if (n.has(v.key as string)) n.delete(v.key as string);
                  else n.add(v.key as string);
                  return n;
                })
              }
              className="mono flex items-center gap-1.5 text-[0.58rem] tracking-widest transition-colors"
              style={{ color: on ? "var(--color-ash)" : "var(--color-faint)" }}
              aria-pressed={on}
            >
              <svg width="16" height="6" aria-hidden>
                <line x1="0" y1="3" x2="16" y2="3" stroke={on ? v.color : "var(--color-grid-2)"} strokeWidth="1.5" strokeDasharray={v.dash} />
              </svg>
              {v.label}
            </button>
          );
        })}
      </div>

      <svg
        width={width}
        height={totalH}
        className="block select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Run telemetry timeline"
      >
        {/* panel labels + frames */}
        <PanelLabel x={PAD_L} y={yTre - 6} text="TREASURY · CASH" />
        <PanelLabel x={PAD_L} y={yFlo - 6} text="FLOWS · REVENUE VS EXPENSES / DAY" />
        <PanelLabel x={PAD_L} y={yVit - 6} text="VITALS · 0–100" />
        <PanelLabel x={PAD_L} y={yEco - 6} text="MACRO · ECONOMY CYCLE ±100" />

        {/* y gridlines + tick values */}
        {geo.yCash.ticks(3).map((t) => (
          <YTick key={`c${t}`} y={geo.yCash(t)} width={width} label={currency(t)} />
        ))}
        {geo.yFlow.ticks(3).map((t) => (
          <YTick key={`f${t}`} y={geo.yFlow(t)} width={width} label={currency(t)} />
        ))}
        {[0, 50, 100].map((t) => (
          <YTick key={`v${t}`} y={yVit + H_VITALS - (t / 100) * H_VITALS} width={width} label={String(t)} />
        ))}
        <YTick y={geo.yE(0)} width={width} label="0" />

        {/* x gridlines + day ticks */}
        {geo.x.ticks(Math.min(8, Math.max(2, Math.floor(width / 130)))).map((t) => (
          <g key={`x${t}`}>
            <line x1={geo.x(t)} y1={yTre} x2={geo.x(t)} y2={yLane + H_LANE} stroke="var(--color-grid)" strokeWidth="1" />
            <text x={geo.x(t)} y={totalH - 6} textAnchor="middle" className="fill-[var(--color-muted)] font-[family-name:var(--font-mono)] text-[9px] tracking-wider">
              D{Math.round(t)}
            </text>
          </g>
        ))}

        {/* critical events cut through every panel */}
        {criticals.map((m, i) => (
          <line
            key={`crit-${m.day}-${i}`}
            x1={geo.x(m.day)}
            y1={yTre}
            x2={geo.x(m.day)}
            y2={yLane + H_LANE}
            stroke="var(--color-phosphor)"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.55"
          />
        ))}

        {/* treasury */}
        <path d={geo.cashArea} fill="var(--color-ash)" opacity="0.07" />
        <path d={geo.cashLine} fill="none" stroke="var(--color-ash)" strokeWidth="1.4" />

        {/* flows */}
        <path d={geo.revLine} fill="none" stroke="var(--color-good)" strokeWidth="1.2" opacity="0.9" />
        <path d={geo.expLine} fill="none" stroke="var(--color-phosphor)" strokeWidth="1.2" opacity="0.85" />

        {/* vitals */}
        {geo.vitalPaths.map((v) => (
          <path key={v.key as string} d={v.d} fill="none" stroke={v.color} strokeWidth="1.2" strokeDasharray={v.dash} opacity="0.9" />
        ))}

        {/* macro economy */}
        <path d={geo.econUp} fill="var(--color-good)" opacity="0.14" />
        <path d={geo.econDn} fill="var(--color-phosphor)" opacity="0.14" />
        <path d={geo.econLine} fill="none" stroke="var(--color-ash-2)" strokeWidth="1" />

        {/* marker lane */}
        <line x1={PAD_L} y1={yLane + H_LANE / 2} x2={width - PAD_R} y2={yLane + H_LANE / 2} stroke="var(--color-grid)" strokeWidth="1" />
        {markers
          .filter((m) => m.day >= first.day && m.day <= last.day)
          .map((m, i) => (
            <rect
              key={`${m.day}-${i}`}
              x={geo.x(m.day) - 1}
              y={m.severity === "critical" ? yLane : yLane + 4}
              width="2"
              height={m.severity === "critical" ? H_LANE : H_LANE - 8}
              fill={MARKER_COLOR[m.severity]}
            />
          ))}

        {/* live edge */}
        <circle cx={geo.x(last.day)} cy={geo.yCash(last.cash)} r="2.5" fill="var(--color-phosphor)" className="pulse" />

        {/* crosshair */}
        {hover !== null && (
          <line x1={geo.x(hover)} y1={yTre} x2={geo.x(hover)} y2={yLane + H_LANE} stroke="var(--color-ash-2)" strokeWidth="1" opacity="0.6" />
        )}
      </svg>

      {/* crosshair readout */}
      {hoverPoint && (
        <div
          className="pointer-events-none absolute top-4 z-10 w-[200px] border border-[var(--color-grid-2)] bg-[color-mix(in_srgb,var(--color-void)_92%,transparent)] p-3 backdrop-blur-sm"
          style={{ left: tooltipLeft }}
        >
          <div className="mono mb-2 text-[0.6rem] tracking-widest text-[var(--color-ash)]">DAY {hoverPoint.day}</div>
          <Read k="CASH" v={currency(hoverPoint.cash)} />
          <Read k="REV / EXP" v={`${currency(hoverPoint.revenue)} / ${currency(hoverPoint.expenses)}`} />
          <Read k="ECONOMY" v={`${hoverPoint.economy >= 0 ? "+" : ""}${hoverPoint.economy.toFixed(0)}`} />
          {VITALS.filter((v) => enabled.has(v.key as string)).map((v) => (
            <Read key={v.key as string} k={v.label} v={(hoverPoint[v.key] as number).toFixed(1)} />
          ))}
          {hoverEvents.length > 0 && (
            <div className="mt-2 border-t border-[var(--color-grid)] pt-2">
              {hoverEvents.slice(0, 3).map((e, i) => (
                <div key={i} className="mono text-[0.6rem] leading-snug" style={{ color: MARKER_COLOR[e.severity] }}>
                  ◆ {e.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mono mt-2 text-[0.6rem] text-[var(--color-faint)]">
        // FULL-RUN TELEMETRY · EVENTS PINNED TO THE DAY THEY FIRED · HOVER FOR THE CROSSHAIR READOUT · DASHED CUTS = CRITICAL EVENTS
      </p>
    </div>
  );
}

function PanelLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} className="fill-[var(--color-muted)] font-[family-name:var(--font-mono)] text-[9px] uppercase" style={{ letterSpacing: "0.14em" }}>
      {text}
    </text>
  );
}

function YTick({ y, width, label }: { y: number; width: number; label: string }) {
  return (
    <g>
      <line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y} stroke="var(--color-grid)" strokeWidth="1" />
      <text x={PAD_L - 6} y={y + 3} textAnchor="end" className="fill-[var(--color-faint)] font-[family-name:var(--font-mono)] text-[9px]">
        {label}
      </text>
    </g>
  );
}

function LegendSwatch({ color, label, fat }: { color: string; label: string; fat?: boolean }) {
  return (
    <span className="mono flex items-center gap-1.5 text-[0.58rem] tracking-widest text-[var(--color-ash-2)]">
      <span className="inline-block w-4" style={{ height: fat ? 5 : 2, background: color, opacity: fat ? 0.35 : 1 }} />
      {label}
    </span>
  );
}

function Read({ k, v }: { k: string; v: string }) {
  return (
    <div className="mono flex items-baseline justify-between text-[0.6rem] leading-relaxed">
      <span className="text-[var(--color-muted)]">{k}</span>
      <span className="tabular text-[var(--color-ash)]">{v}</span>
    </div>
  );
}
