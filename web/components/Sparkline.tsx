"use client";

import { useMemo } from "react";
import { scaleLinear } from "d3-scale";
import { line, area, curveMonotoneX } from "d3-shape";

/**
 * A D3-computed sparkline over the world's history. Pure geometry rendered as
 * SVG — no D3 DOM mutation, so React stays the single renderer.
 */
export function Sparkline({
  points,
  color = "var(--color-str)",
  height = 64,
  width = 320,
}: {
  points: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  const { linePath, areaPath } = useMemo(() => {
    if (points.length < 2) return { linePath: "", areaPath: "" };
    const pad = 3;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const x = scaleLinear().domain([0, points.length - 1]).range([pad, width - pad]);
    const y = scaleLinear()
      .domain([min === max ? min - 1 : min, min === max ? max + 1 : max])
      .range([height - pad, pad]);
    const l = line<number>().x((_, i) => x(i)).y((d) => y(d)).curve(curveMonotoneX);
    const a = area<number>()
      .x((_, i) => x(i))
      .y0(height)
      .y1((d) => y(d))
      .curve(curveMonotoneX);
    return { linePath: l(points) ?? "", areaPath: a(points) ?? "" };
  }, [points, height, width]);

  const gradId = useMemo(() => `spark-${Math.round(width)}-${color.replace(/\W/g, "")}`, [width, color]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
      {linePath && (
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}
