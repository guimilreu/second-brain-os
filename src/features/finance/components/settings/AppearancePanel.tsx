"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

const noopSubscribe = () => () => {};

export function AppearancePanel({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // O tema salvo só existe no navegador: no servidor nenhuma opção aparece marcada.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const current = mounted ? theme : undefined;

  return (
    <Panel title="Aparência" description="Sistema acompanha o tema do seu dispositivo." className={className}>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((option) => {
          const Icon = option.icon;
          const active = current === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-[0.8125rem] font-semibold transition-colors",
                active
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {option.label}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
