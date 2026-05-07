"use client";

import { MotionConfig } from "framer-motion";

type MotionRootProps = {
  children: React.ReactNode;
};

export function MotionRoot({ children }: MotionRootProps) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
