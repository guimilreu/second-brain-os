import { useId } from "react";
import { cn } from "@/lib/utils";

type PaceChartProps = {
  /** Gasto acumulado por dia do mês (índice 0 = dia 1), até hoje. */
  cumulative: number[];
  daysInMonth: number;
  /** Teto do mês para o dia a dia (linha do ritmo ideal). */
  budget: number;
  className?: string;
};

/** Ritmo do mês: área do gasto acumulado contra a linha reta do orçamento. */
export function PaceChart({ cumulative, daysInMonth, budget, className }: PaceChartProps) {
  const id = useId().replace(/:/g, "");
  const top = Math.max(budget, ...cumulative, 1) * 1.08;
  const x = (day: number) => (day / Math.max(daysInMonth - 1, 1)) * 100;
  const y = (value: number) => 100 - (value / top) * 100;
  const points = cumulative.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`);
  const line = points.length ? `M${points.join(" L")}` : "";
  const area = points.length ? `${line} L${x(cumulative.length - 1).toFixed(2)},100 L0,100 Z` : "";
  const last = cumulative.length - 1;
  const over = budget > 0 && cumulative[last] > (budget / daysInMonth) * (last + 1);

  return (
    <div className={cn("relative h-28 w-full", className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={`pace-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={over ? "var(--chart-4)" : "var(--chart-1)"} stopOpacity="0.45" />
            <stop offset="1" stopColor={over ? "var(--chart-4)" : "var(--chart-1)"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {budget > 0 ? (
          <line
            x1="0"
            y1="100"
            x2="100"
            y2={y(budget)}
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeDasharray="2 2.5"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {area ? <path d={area} fill={`url(#pace-${id})`} className="animate-rise" /> : null}
        {line ? (
          <path
            d={line}
            fill="none"
            stroke={over ? "var(--chart-4)" : "var(--chart-1)"}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={100}
            strokeDasharray="100"
            className="animate-draw"
          />
        ) : null}
      </svg>
      {cumulative.length ? (
        <span
          className={cn("absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-card animate-pop", over ? "bg-chart-4" : "bg-primary")}
          style={{
            left: `${x(last)}%`,
            top: `${y(cumulative[last])}%`,
            boxShadow: `0 0 16px ${over ? "var(--chart-4)" : "var(--primary)"}`,
          }}
        />
      ) : null}
    </div>
  );
}
