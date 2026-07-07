"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/start", label: "Start" },
  { href: "/", label: "Overview" },
  { href: "/simulator", label: "Simulator" },
  { href: "/consulting", label: "Guided" },
  { href: "/ask", label: "Ask" },
  { href: "/brief", label: "Brief" },
  { href: "/recommendations", label: "Decisions" },
];

export function Masthead() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-hair bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-4 px-6 py-3.5 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center border border-crimson/50 text-crimson">
            <span className="h-2 w-2 bg-crimson" />
          </span>
          <span className="text-[1.05rem] font-bold tracking-tight text-ink">
            ATHENA<span className="text-crimson"> /</span>
            <span className="ml-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Decision Terminal
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="navlink"
              data-active={path === item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
