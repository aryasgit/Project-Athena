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

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-sm bg-str text-[0.8rem] font-extrabold text-paper"
        style={{ fontFamily: "var(--font-display)" }}>A</span>
      <span>
        <span style={{ fontFamily: "var(--font-display)" }} className="block text-[1.15rem] font-extrabold leading-none tracking-tight text-ink">
          athena<span className="text-str">.</span>
        </span>
        <span className="mt-0.5 block font-mono text-[0.54rem] uppercase tracking-[0.1em] text-faint">
          decision_intel
        </span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  const clock = useClock();
  const mod = useModule();

  return (
    <>
      {/* desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[214px] flex-col border-r border-hair bg-paper md:flex">
        <div className="px-5 py-6">
          <Wordmark />
        </div>

        <nav className="mt-2 flex flex-col gap-0.5 px-3">
          {NAV.map((item, i) => {
            const active = path === item.href;
            return (
              <Link key={item.href} href={item.href} data-active={active} className="sidelink">
                <span className="mr-2 text-faint">{String(i + 1).padStart(2, "0")}</span>
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-str" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-hair px-5 py-4 font-mono text-[0.62rem] text-muted">
          <div className="flex items-center justify-between">
            <span className="text-faint">module</span>
            <span className="text-str">{mod}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            <span className="tabular">{clock}</span>
          </div>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-hair bg-paper px-4 py-3 md:hidden">
        <Wordmark />
        <nav className="flex items-center gap-3 overflow-x-auto">
          {NAV.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className="navlink whitespace-nowrap"
              data-active={path === item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
