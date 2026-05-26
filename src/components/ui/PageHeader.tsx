"use client";

import { motion } from "framer-motion";
import { headerContainer, headerItem, springSnap } from "@/lib/motion/spring";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <motion.div
      className="flex flex-col gap-5 pb-6 lg:flex-row lg:items-end lg:justify-between"
      variants={headerContainer}
      initial="hidden"
      animate="visible"
    >
      <div>
        {eyebrow ? (
          <motion.p
            variants={headerItem}
            className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground"
          >
            {eyebrow}
          </motion.p>
        ) : null}
        <motion.h1
          variants={headerItem}
          className="font-heading max-w-4xl text-3xl font-bold leading-[1.05] tracking-[-0.045em] text-paper-ink md:text-5xl"
        >
          {title}
        </motion.h1>
        <motion.p
          variants={headerItem}
          className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base"
        >
          {description}
        </motion.p>
      </div>
      {action ? (
        <motion.div
          variants={headerItem}
          whileHover={{ y: -3 }}
          transition={springSnap}
          className="flex shrink-0 flex-wrap items-center gap-3"
        >
          {action}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
