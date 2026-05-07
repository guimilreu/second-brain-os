"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type MetricCardProps = {
  title: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  /** Índice para entrada escalonada na lista */
  index?: number;
};

export function MetricCard({
  title,
  value,
  detail,
  trend = "neutral",
  icon: Icon,
  index = 0,
}: MetricCardProps) {
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.06,
        duration: 0.38,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4 }}
      className="glass-surface rounded-3xl p-5 transition-shadow duration-300 hover:shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <motion.div
          whileHover={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl bg-brand-soft p-3 text-brand dark:bg-primary/15 dark:text-primary"
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
      {detail ? (
        <div
          className={cn(
            "mt-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            trend === "up" && "bg-emerald-500/10 text-success",
            trend === "down" && "bg-red-500/10 text-danger",
            trend === "neutral" && "bg-surface-soft text-muted-foreground",
          )}
        >
          {trend !== "neutral" ? <TrendIcon className="h-3.5 w-3.5" /> : null}
          {detail}
        </div>
      ) : null}
    </motion.div>
  );
}
