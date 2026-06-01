"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { springPage, springSnap } from "@/lib/motion/spring";
import { cn } from "@/lib/utils/cn";

export type SubTabItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
};

type SubTabNavProps = {
  tabs: SubTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  layoutId?: string;
  className?: string;
};

export function SubTabNav({
  tabs,
  activeId,
  onChange,
  layoutId = "sub-tab-pill",
  className,
}: SubTabNavProps) {
  const reduce = useReducedMotion();

  return (
    <LayoutGroup id={layoutId}>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200",
                active
                  ? "text-background"
                  : "bg-surface-soft text-muted-foreground hover:text-foreground",
              )}
            >
              {!reduce && active ? (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-xl bg-foreground shadow-paper-sm"
                  transition={springSnap}
                />
              ) : active ? (
                <span className="absolute inset-0 rounded-xl bg-foreground shadow-paper-sm" />
              ) : null}
              <span className="relative z-10 flex items-center gap-2">
                {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

type SubTabContentProps = {
  id: string;
  activeId: string;
  children: React.ReactNode;
  className?: string;
};

export function SubTabContent({ id, activeId, children, className }: SubTabContentProps) {
  const reduce = useReducedMotion();

  if (activeId !== id) {
    return null;
  }

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 12, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.995, transition: { duration: 0.12 } }}
        transition={springPage}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
