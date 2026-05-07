"use client";

import { motion, useReducedMotion } from "framer-motion";
import { springPage } from "@/lib/motion/spring";
import { cn } from "@/lib/utils/cn";

type TabTransitionProps = {
  children: React.ReactNode;
  className?: string;
};

/** Conteúdo de aba com fade + leve escala ao montar. */
export function TabTransition({ children, className }: TabTransitionProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springPage}
      className={cn("min-h-[1px]", className)}
    >
      {children}
    </motion.div>
  );
}
