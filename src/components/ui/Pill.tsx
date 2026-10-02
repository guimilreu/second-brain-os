import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "positive" | "negative" | "warning" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-foreground/[0.07] text-muted-foreground",
  primary: "bg-primary/15 text-primary-ink",
  positive: "bg-positive/14 text-positive",
  negative: "bg-negative/14 text-negative",
  warning: "bg-warning/16 text-warning",
  info: "bg-info/14 text-info",
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
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[0.6875rem] font-semibold whitespace-nowrap [&_svg]:size-3",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
