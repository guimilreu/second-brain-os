"use client";

import { motion, useReducedMotion } from "framer-motion";
import { listContainer, listItem } from "@/lib/motion/spring";
import { cn } from "@/lib/utils/cn";

type StaggerListProps = {
  children: React.ReactNode;
  className?: string;
};

export function StaggerList({ children, className }: StaggerListProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={listContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
};

export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={listItem} className={cn(className)}>
      {children}
    </motion.div>
  );
}
