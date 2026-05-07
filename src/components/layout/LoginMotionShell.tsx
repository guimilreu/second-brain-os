"use client";

import { motion, useReducedMotion } from "framer-motion";
import { springPage } from "@/lib/motion/spring";

type LoginMotionShellProps = {
  children: React.ReactNode;
};

export function LoginMotionShell({ children }: LoginMotionShellProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="glass-surface w-full max-w-[22rem] rounded-3xl p-8 sm:p-9">{children}</div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springPage}
      className="glass-surface w-full max-w-[22rem] rounded-3xl p-8 sm:p-9"
    >
      {children}
    </motion.div>
  );
}
