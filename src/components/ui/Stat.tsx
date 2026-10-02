import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "positive" | "negative" | "warning";

type StatProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
};

const TONE_CLASSES: Record<Tone, string> = {
  default: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
  warning: "text-warning",
};

export function Stat({ label, value, hint, tone = "default", icon: Icon, className }: StatProps) {
  return (
    <div className={cn("tile p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.8125rem] text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="grid size-8 place-items-center rounded-full bg-foreground/[0.06] text-muted-foreground">
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className={cn("display mt-3 text-[1.75rem]", TONE_CLASSES[tone])}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
