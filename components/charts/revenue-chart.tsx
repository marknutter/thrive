"use client";

import { useState, useRef, useCallback } from "react";

export interface DailyRevenue {
  date: string;
  amount: number;
  count: number;
}

interface RevenueChartProps {
  data: DailyRevenue[];
  currency?: string;
}

function formatCurrency(amount: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RevenueChart({ data, currency = "usd" }: RevenueChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    amount: number;
    count: number;
  } | null>(null);

  const padding = { top: 20, right: 16, bottom: 40, left: 60 };
  const viewBoxWidth = 800;
  const viewBoxHeight = 300;
  const chartW = viewBoxWidth - padding.left - padding.right;
  const chartH = viewBoxHeight - padding.top - padding.bottom;

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  // Round up to a nice number for the Y axis
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxAmount)));
  const niceMax = Math.ceil(maxAmount / magnitude) * magnitude;
  const yTicks = 5;

  const barWidth = Math.max(2, Math.min(20, (chartW / data.length) * 0.7));
  const barGap = chartW / data.length;

  // Determine which x-axis labels to show (avoid overlap)
  const maxLabels = Math.floor(chartW / 55);
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || data.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBoxWidth / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const idx = Math.floor((mouseX - padding.left) / barGap);
      if (idx >= 0 && idx < data.length) {
        const d = data[idx];
        const barX = padding.left + idx * barGap + barGap / 2;
        const barY =
          padding.top + chartH - (d.amount / niceMax) * chartH;
        setTooltip({ x: barX, y: barY, date: d.date, amount: d.amount, count: d.count });
      } else {
        setTooltip(null);
      }
    },
    [data, barGap, chartH, niceMax, padding.left, padding.top, viewBoxWidth]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-400 dark:text-zinc-500 text-sm">
        No revenue data for this period.
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Grid lines */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = padding.top + (i / yTicks) * chartH;
          return (
            <line
              key={`grid-${i}`}
              x1={padding.left}
              y1={y}
              x2={padding.left + chartW}
              y2={y}
              className="stroke-zinc-200 dark:stroke-zinc-700"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Y-axis labels */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = padding.top + (i / yTicks) * chartH;
          const value = niceMax - (i / yTicks) * niceMax;
          // Only show a few labels to avoid clutter
          if (i % 1 !== 0) return null;
          return (
            <text
              key={`ylabel-${i}`}
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-zinc-400 dark:fill-zinc-500"
              fontSize={10}
            >
              {formatCurrency(value, currency)}
            </text>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.amount / niceMax) * chartH;
          const x = padding.left + i * barGap + (barGap - barWidth) / 2;
          const y = padding.top + chartH - barH;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(0, barH)}
              rx={Math.min(2, barWidth / 2)}
              className="fill-emerald-500 dark:fill-emerald-400"
              opacity={tooltip?.date === d.date ? 1 : 0.8}
            />
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % labelStep !== 0) return null;
          const x = padding.left + i * barGap + barGap / 2;
          return (
            <text
              key={`xlabel-${d.date}`}
              x={x}
              y={viewBoxHeight - 8}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500"
              fontSize={10}
            >
              {formatShortDate(d.date)}
            </text>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            {/* Vertical guide line */}
            <line
              x1={tooltip.x}
              y1={padding.top}
              x2={tooltip.x}
              y2={padding.top + chartH}
              className="stroke-zinc-300 dark:stroke-zinc-600"
              strokeWidth={0.5}
              strokeDasharray="4,2"
            />
            {/* Dot */}
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={4}
              className="fill-emerald-600 dark:fill-emerald-300"
            />
            {/* Background rect */}
            <rect
              x={Math.min(tooltip.x - 65, viewBoxWidth - padding.right - 135)}
              y={Math.max(padding.top, tooltip.y - 52)}
              width={130}
              height={42}
              rx={6}
              className="fill-zinc-800 dark:fill-zinc-200"
              opacity={0.95}
            />
            {/* Tooltip text - date */}
            <text
              x={Math.min(tooltip.x, viewBoxWidth - padding.right - 70)}
              y={Math.max(padding.top + 16, tooltip.y - 34)}
              textAnchor="middle"
              className="fill-zinc-300 dark:fill-zinc-600"
              fontSize={10}
            >
              {formatShortDate(tooltip.date)}
            </text>
            {/* Tooltip text - amount */}
            <text
              x={Math.min(tooltip.x, viewBoxWidth - padding.right - 70)}
              y={Math.max(padding.top + 32, tooltip.y - 18)}
              textAnchor="middle"
              className="fill-white dark:fill-zinc-900"
              fontSize={12}
              fontWeight="bold"
            >
              {formatCurrency(tooltip.amount, currency)}{" "}
              ({tooltip.count} {tooltip.count === 1 ? "sale" : "sales"})
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
