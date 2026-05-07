"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { springUI } from "@/lib/motion/spring";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.988 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0.15 } : springUI}
      className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-default-50/60 px-6 py-14 text-center dark:border-default-200 dark:bg-default-50/20"
    >
      <motion.div
        initial={reduce ? false : { scale: 0.92 }}
        animate={{ scale: 1 }}
        transition={springUI}
        className="rounded-3xl bg-primary/10 p-4 text-primary"
      >
        <Icon className="h-8 w-8" />
      </motion.div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <motion.div whileHover={reduce ? undefined : { y: -2 }} transition={springUI}>
          <Button onClick={onAction} className="rounded-xl">
            {actionLabel}
          </Button>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
