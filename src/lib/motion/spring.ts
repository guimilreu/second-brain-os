import type { Transition, Variants } from "framer-motion";

/** Troca de página / painéis grandes */
export const springPage: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 34,
  mass: 0.88,
};

/** Cards, listas, UI geral */
export const springUI: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 31,
};

/** Botões, FAB, micro-interações curtas */
export const springSnap: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 36,
};

/** Gavetas / overlays laterais */
export const springDrawer: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 34,
};

export const easeFluid = [0.16, 1, 0.3, 1] as const;

export const staggerFast: Transition = {
  staggerChildren: 0.055,
  delayChildren: 0.04,
};

export const staggerMedium: Transition = {
  staggerChildren: 0.07,
  delayChildren: 0.06,
};

export const headerContainer: Variants = {
  hidden: {},
  visible: {
    transition: staggerFast,
  },
};

export const headerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springUI,
  },
};

export const listContainer: Variants = {
  hidden: {},
  visible: {
    transition: staggerMedium,
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springUI,
  },
};
