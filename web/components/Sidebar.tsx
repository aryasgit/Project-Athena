"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Executive Overview", hint: "Strategy" },
  { href: "/skills", label: "Skill Intelligence", hint: "Talent" },
  { href: "/recommendations", label: "Decision Center", hint: "Actions" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-border bg-surface/40 md:block">
      <div className="sticky top-0 flex h-screen flex-col px-4 py-6">
        <div className="px-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3l7 4v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7l7-4z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">Athena</div>
              <div className="text-[11px] text-ink-faint">Decision Intelligence</div>
            </div>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = path === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-accent-soft text-ink"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <span className="font-medium">{item.label}</span>
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    active ? "text-accent" : "text-ink-faint"
                  }`}
                >
                  {item.hint}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-border bg-surface px-3 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-faint">Module</div>
          <div className="mt-0.5 text-sm font-medium">Placement Intelligence</div>
          <div className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            The analytics engine is dataset-agnostic. Swap the module to reuse it on
            retail, HR or customer data.
          </div>
        </div>
      </div>
    </aside>
  );
}
