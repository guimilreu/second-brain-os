"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { springPage } from "@/lib/motion/spring";
import {
  SectionSkeleton,
  type SkeletonVariant,
} from "@/components/motion/SectionSkeleton";

type ContentRevealProps = {
  loading: boolean;
  skeleton?: SkeletonVariant;
  count?: number;
  skeletonClassName?: string;
  children: React.ReactNode;
  className?: string;
};

/** Crossfade suave entre skeleton e conteúdo carregado. */
export function ContentReveal({
  loading,
  skeleton = "row",
  count = 4,
  skeletonClassName,
  children,
  className,
}: ContentRevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return loading ? (
      <SectionSkeleton variant={skeleton} count={count} className={skeletonClassName} />
    ) : (
      <div className={className}>{children}</div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.14 } }}
        >
          <SectionSkeleton variant={skeleton} count={count} className={skeletonClassName} />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={springPage}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
