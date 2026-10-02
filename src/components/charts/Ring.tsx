import { useId } from "react";
import { cn } from "@/lib/utils";

type RingProps = {
  /** 0–100 (acima de 100 fecha o anel e usa a cor de alerta). */
  value: number;
  thickness?: number;
  /** Gradiente do traço; padrão ciano → lima. */
  from?: string;
  to?: string;
  className?: string;
  children?: React.ReactNode;
};

/** Anel de progresso único com traço em gradiente e brilho. */
export function Ring({ value, thickness = 10, from = "var(--chart-1)", to = "var(--chart-5)", className, children }: RingProps) {
  const id = useId().replace(/:/g, "");
  const radius = 50 - thickness / 2;
  const over = value > 100;
  const pct = Math.max(0, Math.min(value, 100));

  return (
    <div className={cn("relative aspect-square", className)}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90 overflow-visible">
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={over ? "var(--negative)" : from} />
            <stop offset="1" stopColor={over ? "var(--warning)" : to} />
          </linearGradient>
        </defs>
        <circle cx={50} cy={50} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.07} strokeWidth={thickness} />
        {pct > 0 ? (
          <circle
            cx={50}
            cy={50}
            r={radius}
            fill="none"
            stroke={`url(#ring-${id})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${pct} ${100 - pct}`}
            className="animate-arc"
            style={{ filter: `drop-shadow(0 0 6px ${over ? "var(--negative)" : "color-mix(in oklch, var(--chart-1) 60%, transparent)"})` }}
          />
        ) : null}
      </svg>
      {children ? <div className="absolute inset-0 grid place-items-center text-center">{children}</div> : null}
    </div>
  );
}
