"use client";

import { motion } from "framer-motion";

const STAGGER = 0.07;

export function LoginHeroDecor({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: STAGGER, delayChildren: 0.08 },
        },
      }}
      className="contents"
    >
      {children}
    </motion.div>
  );
}

export function LoginHeroItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
