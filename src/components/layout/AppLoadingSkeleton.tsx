"use client";

import { motion, useReducedMotion } from "framer-motion";
import { listContainer, listItem, springPage } from "@/lib/motion/spring";
import { Skeleton } from "@/components/ui/skeleton";

export function AppLoadingSkeleton() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-[1.75rem]" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-32 rounded-[1.75rem]" />
          <Skeleton className="h-32 rounded-[1.75rem]" />
          <Skeleton className="h-32 rounded-[1.75rem]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPage}
      className="space-y-8"
    >
      <motion.div variants={listContainer} initial="hidden" animate="visible" className="space-y-3">
        <motion.div variants={listItem}>
          <Skeleton className="h-4 w-24" />
        </motion.div>
        <motion.div variants={listItem}>
          <Skeleton className="h-10 w-72 max-w-full" />
        </motion.div>
        <motion.div variants={listItem}>
          <Skeleton className="h-5 w-96 max-w-full" />
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPage, delay: 0.08 }}
      >
        <Skeleton className="h-40 w-full rounded-[1.75rem]" />
      </motion.div>
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        {[0, 1, 2].map((i) => (
          <motion.div key={i} variants={listItem}>
            <Skeleton className="h-32 rounded-[1.75rem]" />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
