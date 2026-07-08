"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AgentPools } from "@athena/engine";

/**
 * The living org as a node graph, hand-drawn in SVG + positioned HTML so it
 * renders reliably and matches the HUD exactly: CEO wires to the leadership team
 * and every department; each department wires to its active work. Recomputed
 * each tick, so headcount, morale, project progress and churn animate in place.
 * Monotone; The Phosphor marks the critical (low morale, stalled work).
 */

const EXEC = { w: 168, h: 92 };
const DEPT = { w: 180, h: 112 };
const PROJ = { w: 150, h: 58 };
const PAD = 40;

type Placed = { id: string; x: number; y: number; w: number; h: number; kind: "exec" | "dept" | "project"; data: any };
type Link = { from: string; to: string; crit: boolean };

export function OrgTopology({ agents }: { agents: AgentPools }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const { placed, links, canvasW, canvasH, byId } = useMemo(() => {
    const placed: Placed[] = [];
    const links: Link[] = [];
    const ceo = agents.executives.find((x) => x.role === "CEO") ?? agents.executives[0];

    agents.executives.forEach((x, i) => {
      placed.push({ id: x.id, x: PAD + i * 200, y: PAD, w: EXEC.w, h: EXEC.h, kind: "exec", data: { ...x, isCeo: x.id === ceo?.id } });
      if (ceo && x.id !== ceo.id) links.push({ from: ceo.id, to: x.id, crit: false });
    });

    const shippedByDept = new Map<string, number>();
    for (const p of agents.projects) if (p.status === "shipped") shippedByDept.set(p.deptId, (shippedByDept.get(p.deptId) ?? 0) + 1);

    const deptX = new Map<string, number>();
    agents.departments.forEach((d, i) => {
      const x = PAD + i * 225;
      deptX.set(d.id, x);
      placed.push({ id: d.id, x, y: PAD + 210, w: DEPT.w, h: DEPT.h, kind: "dept", data: { ...d, shipped: shippedByDept.get(d.id) ?? 0 } });
      if (ceo) links.push({ from: ceo.id, to: d.id, crit: false });
    });

    const perDept = new Map<string, number>();
    const live = agents.projects
      .filter((p) => p.status === "active" || p.status === "stalled")
      .sort((a, b) => idNum(a.id) - idNum(b.id));
    for (const p of live) {
      const k = perDept.get(p.deptId) ?? 0;
      perDept.set(p.deptId, k + 1);
      const bx = (deptX.get(p.deptId) ?? PAD) + (DEPT.w - PROJ.w) / 2 + (k % 2) * 28 - 14;
      placed.push({ id: p.id, x: bx, y: PAD + 210 + 150 + k * 86, w: PROJ.w, h: PROJ.h, kind: "project", data: p });
      links.push({ from: p.deptId, to: p.id, crit: p.status === "stalled" });
    }

    const canvasW = Math.max(...placed.map((n) => n.x + n.w), 600) + PAD;
    const canvasH = Math.max(...placed.map((n) => n.y + n.h), 400) + PAD;
    const byId = new Map(placed.map((n) => [n.id, n]));
    return { placed, links, canvasW, canvasH, byId };
  }, [agents]);

  // scale the canvas to fit the container width (never upscale past 1)
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / canvasW));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasW]);

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden" style={{ height: canvasH * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: canvasW, height: canvasH, transform: `scale(${scale})` }}>
        {/* edge layer */}
        <svg width={canvasW} height={canvasH} className="absolute inset-0" style={{ pointerEvents: "none" }}>
          {links.map((l) => {
            const a = byId.get(l.from);
            const b = byId.get(l.to);
            if (!a || !b) return null;
            const sx = a.x + a.w / 2;
            const sy = a.y + a.h;
            const tx = b.x + b.w / 2;
            const ty = b.y;
            const dy = Math.max(24, (ty - sy) / 2);
            return (
              <path
                key={`${l.from}->${l.to}`}
                d={`M ${sx} ${sy} C ${sx} ${sy + dy} ${tx} ${ty - dy} ${tx} ${ty}`}
                fill="none"
                stroke={l.crit ? "var(--color-phosphor)" : "var(--color-grid-2)"}
                strokeWidth={1}
              />
            );
          })}
        </svg>

        {/* node layer */}
        {placed.map((n) => (
          <div key={n.id} className="absolute" style={{ left: n.x, top: n.y, width: n.w, height: n.h }}>
            {n.kind === "exec" && <ExecCard d={n.data} />}
            {n.kind === "dept" && <DeptCard d={n.data} />}
            {n.kind === "project" && <ProjectCard d={n.data} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecCard({ d }: { d: any }) {
  return (
    <div className="h-full border bg-[var(--color-panel)] px-3 py-2" style={{ borderColor: d.isCeo ? "var(--color-phosphor)" : "var(--color-grid-2)" }} title={d.bio}>
      <div className="flex items-center justify-between">
        <span className="mono text-[0.6rem] uppercase tracking-widest" style={{ color: d.isCeo ? "var(--color-phosphor)" : "var(--color-muted)" }}>{d.role}</span>
        <span className="mono text-[0.5rem] uppercase tracking-wider text-[var(--color-faint)]">{d.focus}</span>
      </div>
      <div className="mono mt-0.5 truncate text-[0.72rem] text-[var(--color-ash)]">{d.name}</div>
      <div className="mono truncate text-[0.55rem] text-[var(--color-ash-2)]">{d.archetype}</div>
      <div className="mono mt-1 flex items-center gap-1 text-[0.5rem] uppercase tracking-wider text-[var(--color-faint)]">
        <span>CONF</span>
        <span className="h-[2px] flex-1 bg-[var(--color-grid-2)]">
          <span className="block h-full" style={{ width: `${d.confidence ?? 60}%`, background: (d.confidence ?? 60) < 30 ? "var(--color-phosphor)" : "var(--color-ash-2)" }} />
        </span>
      </div>
    </div>
  );
}

function DeptCard({ d }: { d: any }) {
  const crit = d.morale < 40;
  return (
    <div className="h-full border bg-[var(--color-panel)] px-3.5 py-2.5" style={{ borderColor: crit ? "var(--color-phosphor)" : "var(--color-grid-2)" }}>
      <div className="flex items-baseline justify-between">
        <span className="display text-[0.95rem] tracking-tight text-[var(--color-ash)]">{d.name}</span>
        <span className="mono text-[0.6rem] text-[var(--color-muted)]">{d.headcount}p</span>
      </div>
      <MiniBar label="MORALE" value={d.morale} crit={crit} />
      <MiniBar label="EFFECT" value={d.effectiveness} />
      {d.shipped > 0 && <div className="mono mt-1 text-[0.55rem] uppercase tracking-wider text-[var(--color-muted)]">▲ {d.shipped} shipped</div>}
    </div>
  );
}

function ProjectCard({ d }: { d: any }) {
  const stalled = d.status === "stalled";
  return (
    <div className="h-full border border-[var(--color-grid)] bg-[var(--color-void)] px-3 py-1.5">
      <div className="mono truncate text-[0.62rem]" style={{ color: stalled ? "var(--color-phosphor)" : "var(--color-ash)" }}>{d.name}</div>
      <div className="mt-1 h-[2px] w-full bg-[var(--color-grid-2)]">
        <div className="h-full transition-[width] duration-500" style={{ width: `${d.progress}%`, background: stalled ? "var(--color-phosphor)" : "var(--color-ash-2)" }} />
      </div>
      <div className="mono mt-0.5 text-[0.5rem] uppercase tracking-wider text-[var(--color-faint)]">{stalled ? "STALLED" : `${Math.round(d.progress)}%`}</div>
    </div>
  );
}

function MiniBar({ label, value, crit }: { label: string; value: number; crit?: boolean }) {
  return (
    <div className="mt-1.5">
      <div className="mono mb-0.5 flex justify-between text-[0.5rem] uppercase tracking-wider text-[var(--color-faint)]">
        <span>{label}</span>
        <span>{value.toFixed(0)}</span>
      </div>
      <div className="h-[2px] w-full bg-[var(--color-grid-2)]">
        <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: crit ? "var(--color-phosphor)" : "var(--color-ash-2)" }} />
      </div>
    </div>
  );
}

function idNum(id: string): number {
  const n = Number(id.split("-").pop());
  return Number.isFinite(n) ? n : 0;
}
