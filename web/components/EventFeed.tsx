"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { OrgEvent } from "@athena/engine";

/**
 * The world narrating itself. Deterministic in, no AI. Monotone: the kind reads
 * as a grey terminal tag; The Phosphor lights only on critical severity.
 */

// Colour-coded by meaning: good = green, bad = red (phosphor), neutral = white.
const SEVERITY_COLOR: Record<OrgEvent["severity"], string> = {
  info: "var(--color-ash)",
  good: "var(--color-good)",
  warn: "var(--color-phosphor)",
  critical: "var(--color-phosphor)",
};

export function EventFeed({ events }: { events: OrgEvent[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="flex flex-col">
      <AnimatePresence initial={false}>
        {events.map((e, i) => {
          const color = SEVERITY_COLOR[e.severity];
          return (
            <motion.li
              key={`${e.day}-${e.title}-${i}`}
              initial={reduce ? false : { opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="border-b border-[var(--color-grid)] px-4 py-3 first:border-t"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0" style={{ background: color }} aria-hidden />
                <span className="mono text-[0.55rem] uppercase tracking-widest text-[var(--color-muted)]">
                  {e.kind}
                </span>
                <span className="mono ml-auto text-[0.55rem] text-[var(--color-faint)]">DAY {e.day}</span>
              </div>
              <p className="mono mt-1.5 text-[0.78rem] font-medium" style={{ color }}>
                {e.title}
              </p>
              <p className="mt-1 text-[0.78rem] leading-snug text-[var(--color-muted)]">{e.detail}</p>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
