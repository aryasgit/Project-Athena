"use client";

import { useEffect, useState } from "react";

/** IDE-style status bar pinned to the bottom. Monotone with a neon pulse. */
export function StatusBar() {
  const [mod, setMod] = useState("placement");
  useEffect(() => {
    const m = document.cookie.match(/athena_module=(\w+)/);
    if (m) setMod(m[1]);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-hair bg-ide px-4 py-1.5 font-mono text-[0.62rem] text-muted md:pl-[228px]">
      <span className="flex items-center gap-1.5 text-str">
        <span className="h-1.5 w-1.5 rounded-full bg-positive" />READY
      </span>
      <span className="text-faint">module<span className="text-ink-2">:{mod}</span></span>
      <span className="hidden text-faint sm:inline">engine<span className="text-ink-2">:deterministic+gemini</span></span>
      <span className="hidden text-faint md:inline">db<span className="text-ink-2">:supabase</span></span>
      <span className="ml-auto hidden text-faint md:inline">athena v0.1 · main</span>
    </div>
  );
}
