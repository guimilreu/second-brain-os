import { cn } from "@/lib/utils";

export type StackedPart = { key: string; value: number; color: string; label?: string };

/** Barra horizontal em segmentos arredondados com respiro entre eles. */
export function StackedBar({ parts, className }: { parts: StackedPart[]; className?: string }) {
  const total = parts.reduce((sum, part) => sum + Math.max(part.value, 0), 0);
  return (
    <div className={cn("flex h-2.5 w-full gap-1", className)}>
      {total > 0 ? (
        parts
          .filter((part) => part.value > 0)
          .map((part, index) => (
            <span
              key={part.key}
              title={part.label}
              className="h-full origin-left rounded-full animate-rise"
              style={{
                flexGrow: part.value / total,
                flexBasis: 0,
                minWidth: "0.5rem",
                backgroundColor: part.color,
                animationDelay: `${index * 80}ms`,
              }}
            />
          ))
      ) : (
        <span className="h-full w-full rounded-full bg-foreground/[0.07]" />
      )}
    </div>
  );
}
