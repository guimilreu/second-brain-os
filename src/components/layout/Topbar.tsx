"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS, isNavActive } from "@/components/layout/nav";
import { NewEntryButton } from "@/components/layout/NewEntryButton";
import { PrivacyToggle } from "@/components/layout/PrivacyToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

export function Topbar() {
  const pathname = usePathname();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);

  const current = NAV_SECTIONS.flatMap((section) => section.items).find((item) =>
    isNavActive(pathname, item.href),
  );

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu />
      </Button>
      <p className="truncate text-sm font-bold lg:hidden">{current?.label ?? "Second Brain"}</p>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="ml-auto hidden h-8 w-64 items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-[0.8125rem] text-muted-foreground shadow-xs transition-colors hover:border-muted-foreground/40 md:flex lg:ml-0"
      >
        <Search className="size-4" />
        Buscar…
        <kbd className="ml-auto rounded border border-border bg-muted px-1.5 font-mono text-[0.6875rem]">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setCommandOpen(true)}
          aria-label="Buscar"
        >
          <Search />
        </Button>
        <PrivacyToggle />
        <ThemeToggle />
        <div className="hidden sm:block">
          <NewEntryButton />
        </div>
      </div>
    </header>
  );
}
