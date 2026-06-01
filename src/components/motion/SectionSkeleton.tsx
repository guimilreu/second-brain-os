"use client";

import { motion, useReducedMotion } from "framer-motion";
import { listContainer, listItem } from "@/lib/motion/spring";
import { cn } from "@/lib/utils/cn";

export type SkeletonVariant = "row" | "card" | "block" | "hero" | "compact";

const VARIANT_STYLES: Record<SkeletonVariant, string> = {
  row: "h-16 rounded-2xl",
  card: "h-44 rounded-3xl",
  block: "h-80 rounded-3xl",
  hero: "h-40 rounded-[1.75rem]",
  compact: "h-28 rounded-2xl",
};

type SectionSkeletonProps = {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
};

export function SectionSkeleton({
  variant = "row",
  count = 4,
  className,
}: SectionSkeletonProps) {
  const reduce = useReducedMotion();
  const itemClass = cn(
    "border border-border bg-gradient-to-r from-muted/45 via-muted/25 to-muted/45 bg-[length:200%_100%] animate-skeleton-shimmer",
    VARIANT_STYLES[variant],
  );

  if (reduce) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={itemClass} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={listContainer}
      initial="hidden"
      animate="visible"
      className={cn("space-y-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} variants={listItem} className={itemClass} />
      ))}
    </motion.div>
  );
}
