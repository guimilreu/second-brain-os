"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const noopSubscribe = () => () => {};

const LABELS = { light: "Claro", dark: "Escuro", system: "Sistema" } as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const current = (mounted ? theme : "system") as keyof typeof LABELS;
  const next = current === "light" ? "dark" : current === "dark" ? "system" : "light";
  const Icon = current === "dark" ? Moon : current === "light" ? Sun : Monitor;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Tema: ${LABELS[current] ?? "Sistema"}. Alternar`}
      title={`Tema: ${LABELS[current] ?? "Sistema"}`}
    >
      <Icon />
    </Button>
  );
}
