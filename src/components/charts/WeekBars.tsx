import { cn } from "@/lib/utils";

export type WeekBar = { label: string; value: number; isToday: boolean; isFuture: boolean; title: string };

/** Barras de segunda a domingo; os dias que ainda não chegaram aparecem como pontinho tracejado. */
export function WeekBars({ bars, className }: { bars: WeekBar[]; className?: string }) {
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  return (
    <div className={cn("flex h-36 items-end gap-2", className)}>
      {bars.map((bar, index) => {
        const height = bar.value > 0 ? Math.max((bar.value / max) * 100, 7) : 0;
        return (
          <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={bar.title}>
            <div className="flex w-full flex-1 items-end justify-center">
              {bar.isFuture ? (
                <span className="mb-0.5 size-3 rounded-full border border-dashed border-foreground/25" />
              ) : bar.value > 0 ? (
                <span
                  className={cn(
                    "w-full max-w-7 origin-bottom rounded-full animate-grow",
                    bar.isToday ? "bg-primary shadow-[0_0_22px_-4px_var(--primary)]" : "bg-lime",
                  )}
                  style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }}
                />
              ) : (
                <span className="mb-0.5 size-3 rounded-full bg-foreground/10" />
              )}
            </div>
            <span className={cn("text-[0.6875rem]", bar.isToday ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
