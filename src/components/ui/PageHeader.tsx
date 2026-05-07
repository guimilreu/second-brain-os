"use client";

import { motion } from "framer-motion";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="mb-2 text-sm font-medium uppercase tracking-[0.24em] text-brand dark:text-primary"
          >
            {eyebrow}
          </motion.p>
        ) : null}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
          className="text-3xl font-semibold tracking-tight md:text-5xl"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground"
        >
          {description}
        </motion.p>
      </div>
      {action ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.28, delay: 0.14 }}
          className="flex shrink-0 items-center gap-3"
        >
          {action}
        </motion.div>
      ) : null}
    </div>
  );
}
