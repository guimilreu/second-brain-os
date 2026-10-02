"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SegmentedOption<T extends string> = { value: T; label: string; icon?: LucideIcon };

type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
};

export function Segmented<T extends string>({ options, value, onChange, className, size = "md" }: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-foreground/[0.06] p-1 scrollbar-none", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-[background-color,color] duration-200",
              size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-3.5 text-[0.8125rem]",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
