"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

/**
 * A figure that rolls to its new value each tick — the visual heartbeat of a
 * live metric. Motion conveys the state change; it isn't decoration. Honors
 * prefers-reduced-motion by snapping instantly.
 */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 80, damping: 22, mass: 0.7 });
  const text = useTransform(reduce ? mv : spring, (v) => format(v));

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}
