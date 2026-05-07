"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { springUI } from "@/lib/motion/spring";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type SectionCardProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springUI}
      whileHover={{ y: -2 }}
    >
      <Card
        className={cn(
          "rounded-3xl border border-border/80 bg-card shadow-paper-sm",
          className,
        )}
      >
        {(title || eyebrow || action) && (
          <CardHeader className="flex items-start justify-between gap-4 px-5 pt-5 pb-0">
            <div className="flex min-w-0 items-start gap-3">
              {Icon ? (
                <div className="rounded-2xl border border-border bg-surface-soft p-2.5 text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              ) : null}
              <div className="min-w-0">
                {eyebrow ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {eyebrow}
                  </p>
                ) : null}
                {title ? (
                  <h2 className="font-heading mt-1.5 text-lg font-semibold tracking-tight text-foreground">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                ) : null}
              </div>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </CardHeader>
        )}
        <CardContent className={cn("px-5 pb-5 pt-5", bodyClassName)}>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
