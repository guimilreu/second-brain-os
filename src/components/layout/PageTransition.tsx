"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { springPage } from "@/lib/motion/spring";

type PageTransitionProps = {
  children: React.ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 16, scale: 0.996 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springPage}
      className="min-h-[1px]"
    >
      {children}
    </motion.div>
  );
}
