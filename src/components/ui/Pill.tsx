import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "positive" | "negative" | "warning" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-accent text-accent-foreground",
  positive: "bg-positive/12 text-positive",
  negative: "bg-negative/12 text-negative",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/12 text-info",
};

type PillProps = {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
};

export function Pill({ tone = "neutral", children, className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[0.6875rem] font-semibold whitespace-nowrap [&_svg]:size-3",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
