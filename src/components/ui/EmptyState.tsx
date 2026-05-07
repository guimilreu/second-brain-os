"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-4 rounded-[2rem] border border-dashed border-border bg-default-50/60 px-6 py-14 text-center dark:border-default-200 dark:bg-default-50/20"
    >
      <div className="rounded-3xl bg-primary/10 p-4 text-primary">
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="rounded-xl">
          {actionLabel}
        </Button>
      ) : null}
    </motion.div>
  );
}
