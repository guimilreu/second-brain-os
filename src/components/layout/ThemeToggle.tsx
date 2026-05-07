"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { springSnap } from "@/lib/motion/spring";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      transition={springSnap}
      onClick={() => setTheme(nextTheme)}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface text-foreground transition-colors hover:border-brand hover:text-brand dark:bg-default-50/40 dark:hover:text-primary"
      aria-label="Alternar tema"
      title={`Tema atual: ${theme ?? "system"}`}
    >
      <Icon className="h-5 w-5" />
    </motion.button>
  );
}
