"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = (localStorage.getItem("athena-theme") as "light" | "dark") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    setTheme(saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("athena-theme", next);
      setTheme(next);
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // View Transitions spread, per the Heritage motion law; instant fallback.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (!doc.startViewTransition || reduce) {
      apply();
      return;
    }
    try {
      doc.startViewTransition(apply);
    } catch {
      apply();
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="grid h-[31px] w-[34px] place-items-center border border-hair text-[0.95rem] transition-colors hover:border-ink"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
