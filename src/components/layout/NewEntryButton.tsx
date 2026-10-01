"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntryStore } from "@/stores/entry-store";

type NewEntryButtonProps = {
  /** "fab" = botão redondo da barra inferior no mobile. */
  variant?: "button" | "fab";
};

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest("input, textarea, select, [contenteditable=true], [role=dialog]"));
}

export function NewEntryButton({ variant = "button" }: NewEntryButtonProps) {
  const openNew = useEntryStore((state) => state.openNew);

  useEffect(() => {
    if (variant !== "button") return;
    // Atalho do ícone instalado ("Lançar") abre direto o formulário.
    const url = new URL(window.location.href);
    if (url.searchParams.get("lancar") === "1") {
      url.searchParams.delete("lancar");
      window.history.replaceState(null, "", url);
      openNew();
    }
  }, [openNew, variant]);

  useEffect(() => {
    if (variant !== "button") return;
    // Atalho "N" para lançar de qualquer tela no desktop.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "n" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      event.preventDefault();
      openNew();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openNew, variant]);

  if (variant === "fab") {
    return (
      <Button
        size="icon-lg"
        className="size-12 rounded-full shadow-md"
        aria-label="Lançar"
        onClick={() => openNew()}
      >
        <Plus className="size-5" />
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={() => openNew()} title="Lançar (N)">
      <Plus />
      Lançar
      <kbd className="ml-1 hidden rounded bg-primary-foreground/15 px-1 font-mono text-[0.625rem] lg:inline">N</kbd>
    </Button>
  );
}
