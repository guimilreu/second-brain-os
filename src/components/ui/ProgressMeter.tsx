"use client";

import { cn } from "@/lib/utils/cn";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";

type ProgressMeterProps = {
  value: number;
  label?: string;
  color?: "primary" | "success" | "warning" | "danger";
};

const indicatorColors: Record<NonNullable<ProgressMeterProps["color"]>, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function ProgressMeter({ value, label, color = "primary" }: ProgressMeterProps) {
  const normalized = Math.min(Math.max(value, 0), 100);

  return (
    <Progress aria-label={label ?? "Progresso"} value={normalized} className="gap-0">
      <ProgressTrack className="h-1.5 bg-default-100">
        <ProgressIndicator
          className={cn("transition-all duration-500", indicatorColors[color])}
        />
      </ProgressTrack>
    </Progress>
  );
}
