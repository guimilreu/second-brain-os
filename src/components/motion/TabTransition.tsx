"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { springPage } from "@/lib/motion/spring";
import { cn } from "@/lib/utils/cn";

type TabTransitionProps = {
  children: React.ReactNode;
  className?: string;
  /** Chave única para reanimar ao trocar aba/painel. */
  motionKey?: string;
};

/** Conteúdo de aba com fade + leve escala ao montar ou trocar. */
export function TabTransition({ children, className, motionKey = "tab" }: TabTransitionProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={motionKey}
        initial={{ opacity: 0, y: 12, scale: 0.992 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.995, transition: { duration: 0.12 } }}
        transition={springPage}
        className={cn("min-h-[1px]", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
