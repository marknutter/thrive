"use client";

import { useState, useMemo } from "react";

interface DailyRevenue {
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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { maxAmount, yTicks, barWidth, chartWidth, chartHeight } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.amount), 100);
    // Round up to a nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const niceMax = Math.ceil(max / magnitude) * magnitude;
    const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
    const w = Math.max(600, data.length * 16);
    return {
      maxAmount: niceMax,
      yTicks: ticks,
      barWidth: Math.max(4, Math.min(20, (w - 80) / data.length - 2)),
      chartWidth: w,
      chartHeight: 240,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
        No revenue data for this period.
      </div>
    );
  }

  const padLeft = 70;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 32;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  // Label every Nth date to avoid crowding
  const labelInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="relative overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto min-w-[400px]"
        preserveAspectRatio="xMinYMid meet"
      >
        {/* Grid lines + Y labels */}
        {yTicks.map((tick, i) => {
          const y = padTop + plotH - (tick / maxAmount) * plotH;
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={chartWidth - padRight}
                y2={y}
                className="stroke-zinc-200 dark:stroke-zinc-700"
                strokeWidth={0.5}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-400 dark:fill-zinc-500"
                fontSize={10}
              >
                {formatCurrency(tick, currency)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = maxAmount > 0 ? (d.amount / maxAmount) * plotH : 0;
          const x = padLeft + (i / data.length) * plotW + (plotW / data.length - barWidth) / 2;
          const y = padTop + plotH - barH;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={d.date}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 0)}
                rx={2}
                className={
                  isHovered
                    ? "fill-emerald-500 dark:fill-emerald-400"
                    : "fill-emerald-400 dark:fill-emerald-600"
                }
              />
              {/* Invisible wider hit area */}
              <rect
                x={padLeft + (i / data.length) * plotW}
                y={padTop}
                width={plotW / data.length}
                height={plotH}
                fill="transparent"
              />
            </g>
          );
        })}

        {/* X-axis date labels */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const x = padLeft + (i / data.length) * plotW + plotW / data.length / 2;
          return (
            <text
              key={d.date}
              x={x}
              y={chartHeight - 6}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500"
              fontSize={9}
            >
              {formatShortDate(d.date)}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute pointer-events-none bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 rounded-lg text-xs shadow-lg z-10"
          style={{
            left: `${((padLeft + (hoveredIdx / data.length) * plotW + plotW / data.length / 2) / chartWidth) * 100}%`,
            top: "8px",
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-medium">{formatShortDate(data[hoveredIdx].date)}</div>
          <div>{formatCurrency(data[hoveredIdx].amount, currency)}</div>
          <div className="text-zinc-400 dark:text-zinc-500">
            {data[hoveredIdx].count} sale{data[hoveredIdx].count !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
