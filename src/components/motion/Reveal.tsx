"use client";

import { motion, useReducedMotion } from "framer-motion";
import { springPage } from "@/lib/motion/spring";
import { cn } from "@/lib/utils/cn";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
};

/** Entrada suave ao entrar no viewport — útil em páginas RSC ao redor de blocos. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 20,
  once = true,
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-40px", amount: 0.1 }}
      transition={{ ...springPage, delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
