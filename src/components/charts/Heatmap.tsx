import { cn } from "@/lib/utils";

export type HeatDay = {
  date: string;
  day: number;
  /** 0–1: intensidade relativa ao maior dia. */
  level: number;
  label: string;
  isToday: boolean;
  isFuture: boolean;
};

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

/** Calendário do mês (segunda a domingo) com a intensidade de gasto de cada dia. */
export function Heatmap({ days, leadingBlanks, className }: { days: HeatDay[]; leadingBlanks: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-7 gap-1.5", className)}>
      {WEEKDAYS.map((label, index) => (
        <span key={index} className="pb-0.5 text-center text-[0.625rem] font-medium text-muted-foreground/70">
          {label}
        </span>
      ))}
      {Array.from({ length: leadingBlanks }, (_, index) => (
        <span key={`blank-${index}`} />
      ))}
      {days.map((day, index) => (
        <span
          key={day.date}
          title={day.label}
          className={cn(
            "grid aspect-square place-items-center rounded-[0.45rem] text-[0.5625rem] font-semibold tabular-nums animate-pop",
            day.isFuture
              ? "border border-dashed border-foreground/12 text-muted-foreground/50"
              : day.level === 0
                ? "bg-foreground/[0.05] text-muted-foreground/70"
                : "text-[#132000]",
            day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
          )}
          style={
            !day.isFuture && day.level > 0
              ? {
                  backgroundColor: `color-mix(in oklch, var(--lime) ${Math.round(28 + day.level * 72)}%, transparent)`,
                  animationDelay: `${index * 12}ms`,
                }
              : { animationDelay: `${index * 12}ms` }
          }
        >
          {day.day}
        </span>
      ))}
    </div>
  );
}
