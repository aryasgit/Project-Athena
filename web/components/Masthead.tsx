"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function LiveClock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hidden items-center gap-1.5 font-mono text-[0.7rem] text-muted lg:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-positive" />
      {t}
    </span>
  );
}

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
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-sm bg-str text-[0.7rem] font-bold text-paper">
            A
          </span>
          <span style={{ fontFamily: "var(--font-display)" }}
            className="text-[1.1rem] font-extrabold tracking-tight text-ink">
            athena<span className="text-str">.</span>
          </span>
          <span className="hidden font-mono text-[0.58rem] uppercase tracking-[0.08em] text-faint sm:inline">
            decision_intel
          </span>
        </Link>

        <div className="flex items-center gap-5">
          <nav className="hidden items-center gap-5 md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="navlink"
                data-active={path === item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <LiveClock />
        </div>
      </div>
    </header>
  );
}
