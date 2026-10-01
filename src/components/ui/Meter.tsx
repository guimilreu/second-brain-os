import { cn } from "@/lib/utils";

type MeterProps = {
  /** Percentual 0–100; acima de 100 fica cheio e muda para tom de alerta. */
  value: number;
  tone?: "primary" | "positive" | "negative" | "warning" | "auto";
  className?: string;
  /** Cor livre (ex.: cor do cofrinho) — tem precedência sobre `tone`. */
  color?: string;
};

const TONE_CLASSES = {
  primary: "bg-primary",
  positive: "bg-positive",
  negative: "bg-negative",
  warning: "bg-warning",
} as const;

export function Meter({ value, tone = "primary", className, color }: MeterProps) {
  const clamped = Math.max(0, Math.min(value, 100));
  const resolved =
    tone === "auto" ? (value > 100 ? "negative" : value >= 85 ? "warning" : "positive") : tone;
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", !color && TONE_CLASSES[resolved])}
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
