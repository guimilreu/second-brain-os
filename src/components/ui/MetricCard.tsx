"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Landmark,
  PiggyBank,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { springSnap, springUI } from "@/lib/motion/spring";
import { cn } from "@/lib/utils/cn";

/** Chaves estáveis serializáveis (Server Component → Client Component). */
export const metricCardIcons = {
  landmark: Landmark,
  "trending-up": TrendingUp,
  "check-circle": CheckCircle2,
  target: Target,
  wallet: Wallet,
  "calendar-clock": CalendarClock,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
} satisfies Record<string, LucideIcon>;

export type MetricCardIconName = keyof typeof metricCardIcons;

type MetricCardProps = {
  title: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "neutral";
  icon: MetricCardIconName;
  /** Índice para entrada escalonada na lista */
  index?: number;
};

export function MetricCard({
  title,
  value,
  detail,
  trend = "neutral",
  icon,
  index = 0,
}: MetricCardProps) {
  const Icon = metricCardIcons[icon];
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;
  const prefersReducedMotion = useReducedMotion();
  const entryTransition = prefersReducedMotion
    ? { duration: 0.2 }
    : { ...springUI, delay: index * 0.06 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={entryTransition}
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      className="glass-surface rounded-3xl p-5 transition-[box-shadow,transform] duration-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <motion.div
          whileHover={{ rotate: [0, -6, 6, 0] }}
          transition={springSnap}
          className="rounded-2xl border border-border bg-surface-soft p-2.5 text-foreground"
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
