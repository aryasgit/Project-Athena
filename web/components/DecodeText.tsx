"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * DecodeText — a header doesn't fade in, it *decodes*: cycles through random
 * glyphs and resolves into the real text, character by character. Hand-rolled
 * (no paid GSAP plugin), deterministic-friendly, and reduced-motion aware
 * (renders the final text instantly). Fires on mount and, optionally, when it
 * first scrolls into view.
 */

const GLYPHS = "▁▂▃▄▅▆▇█0123456789ABCDEF#%&@/\\|<>*+=".split("");

export function DecodeText({
  text,
  className,
  as: Tag = "span",
  speed = 28,
  revealPerTick = 0.5,
  onView = false,
}: {
  text: string;
  className?: string;
  as?: React.ElementType;
  /** ms per frame */
  speed?: number;
  /** characters locked per frame */
  revealPerTick?: number;
  /** decode when scrolled into view instead of on mount */
  onView?: boolean;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? text : "");
  const ref = useRef<HTMLElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) {
      setDisplay(text);
      return;
    }
    let raf = 0;
    let last = 0;
    let revealed = 0;

    const run = () => {
      const tick = (t: number) => {
        if (t - last >= speed) {
          last = t;
          revealed = Math.min(text.length, revealed + revealPerTick);
          const locked = Math.floor(revealed);
          let out = text.slice(0, locked);
          for (let i = locked; i < text.length; i++) {
            out += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
          setDisplay(out);
          if (locked >= text.length) return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (!onView) {
      run();
    } else {
      const el = ref.current;
      if (!el) return;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !started.current) {
            started.current = true;
            run();
            io.disconnect();
          }
        },
        { threshold: 0.4 },
      );
      io.observe(el);
      return () => {
        io.disconnect();
        cancelAnimationFrame(raf);
      };
    }
    return () => cancelAnimationFrame(raf);
  }, [text, speed, revealPerTick, onView, reduce]);

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      <span aria-hidden>{display || " "}</span>
    </Tag>
  );
}
