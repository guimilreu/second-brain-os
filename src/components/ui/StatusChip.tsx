"use client";

import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";

type StatusColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";
type StatusVariant = "flat" | "bordered" | "solid";

type StatusChipProps = {
  children: React.ReactNode;
  color?: StatusColor;
  variant?: StatusVariant;
  startContent?: React.ReactNode;
};

const colorClasses: Record<StatusColor, string> = {
  default: "bg-secondary text-secondary-foreground border-transparent",
  primary: "bg-primary/10 text-primary border-transparent",
  secondary: "bg-secondary text-secondary-foreground border-transparent",
  success: "bg-success/10 text-success border-transparent",
  warning: "bg-warning/10 text-warning border-transparent",
  danger: "bg-danger/10 text-danger border-transparent",
};

const variantColorClasses: Record<StatusVariant, Record<StatusColor, string>> = {
  flat: colorClasses,
  solid: {
    default: "bg-secondary text-secondary-foreground border-transparent",
    primary: "bg-primary text-primary-foreground border-transparent",
    secondary: "bg-secondary text-secondary-foreground border-transparent",
    success: "bg-success text-white border-transparent",
    warning: "bg-warning text-white border-transparent",
    danger: "bg-danger text-white border-transparent",
  },
  bordered: {
    default: "bg-transparent text-foreground border-border",
    primary: "bg-transparent text-primary border-primary",
    secondary: "bg-transparent text-secondary-foreground border-border",
    success: "bg-transparent text-success border-success",
    warning: "bg-transparent text-warning border-warning",
    danger: "bg-transparent text-danger border-danger",
  },
};

export function StatusChip({
  children,
  color = "default",
  variant = "flat",
  startContent,
}: StatusChipProps) {
  return (
    <Badge
      className={cn(
        "gap-1 rounded-full font-medium",
        variantColorClasses[variant][color],
      )}
    >
      {startContent}
      {children}
    </Badge>
  );
}
