"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/skills", label: "Skills" },
  { href: "/simulator", label: "Simulator" },
  { href: "/ask", label: "Ask" },
  { href: "/brief", label: "Brief" },
  { href: "/recommendations", label: "Decisions" },
];

export function Masthead() {
  const path = usePathname();
  return (
    <header
      className="sticky top-0 z-20 border-b border-ink bg-paper"
      style={{ borderBottomWidth: 1 }}
    >
      <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-6 py-4 md:px-10">
        <Link href="/" className="flex items-baseline gap-3">
          <span
            className="text-[1.35rem] tracking-[0.01em]"
            style={{ fontFamily: "var(--font-wordmark)" }}
          >
            Athena<span className="text-crimson">.</span>
          </span>
          <span className="hidden border border-gold px-2 py-[2px] text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-gold sm:inline">
            Decision Intelligence
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <div className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="navlink"
                data-active={path === item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
