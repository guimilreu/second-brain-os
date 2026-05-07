"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        className={cn(
          "rounded-2xl border border-border bg-background/80 shadow-[0_24px_80px_rgb(15_23_42/0.08)] backdrop-blur-xl dark:bg-default-50/30",
          className,
        )}
      >
        {(title || eyebrow || action) && (
          <CardHeader className="flex items-start justify-between gap-4 px-5 pt-5 pb-0">
            <div className="flex min-w-0 items-start gap-3">
              {Icon ? (
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              ) : null}
              <div className="min-w-0">
                {eyebrow ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {eyebrow}
                  </p>
                ) : null}
                {title ? (
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
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
