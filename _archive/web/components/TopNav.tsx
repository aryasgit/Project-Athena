"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/start", label: "start" },
  { href: "/", label: "overview" },
  { href: "/simulator", label: "simulator" },
  { href: "/consulting", label: "guided" },
  { href: "/ask", label: "ask" },
  { href: "/brief", label: "brief" },
  { href: "/recommendations", label: "decisions" },
];

function useClock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function useModule() {
  const [m, setM] = useState("placement");
  useEffect(() => {
    const match = document.cookie.match(/athena_module=(\w+)/);
    if (match) setM(match[1]);
  }, []);
  return m;
}

export function TopNav() {
  const path = usePathname();
  const clock = useClock();
  const mod = useModule();

  return (
    <header className="sticky top-0 z-30 border-b border-hair bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-5 py-3.5 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-sm bg-str text-[0.72rem] font-extrabold text-paper"
            style={{ fontFamily: "var(--font-display)" }}>A</span>
          <span style={{ fontFamily: "var(--font-display)" }}
            className="text-[1.1rem] font-extrabold tracking-tight text-ink">
            athena<span className="text-str">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-5 md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="navlink" data-active={path === item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="hidden items-center gap-1.5 font-mono text-[0.68rem] text-muted lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />{clock}
          </span>
          <span className="rounded-full border border-hair px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-str">
            {mod}
          </span>
        </div>
      </div>
    </header>
  );
}
