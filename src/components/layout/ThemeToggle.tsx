"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { springSnap } from "@/lib/motion/spring";

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-11 w-11 cursor-default items-center justify-center rounded-2xl border border-border bg-surface opacity-60 dark:bg-default-50/40"
        aria-label="Alternar tema"
      />
    );
  }

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      transition={springSnap}
      onClick={() => setTheme(nextTheme)}
      className="icon-action h-11 w-11 rounded-2xl text-foreground hover:text-brand dark:bg-default-50/40 dark:hover:text-primary"
      aria-label="Alternar tema"
      title={`Tema atual: ${theme ?? "system"}`}
    >
      <Icon className="h-5 w-5" />
    </motion.button>
  );
}
