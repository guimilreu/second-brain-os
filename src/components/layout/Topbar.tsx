"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { PrivacyToggle } from "@/components/layout/PrivacyToggle";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

/** Só no celular/tablet: no desktop a busca e o "Lançar" moram no menu lateral. */
export function Topbar() {
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 bg-background/70 px-4 backdrop-blur-xl md:px-6 lg:hidden">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark className="size-8" />
        <span className="text-[0.9375rem] font-semibold tracking-tight">Second Brain</span>
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setCommandOpen(true)} aria-label="Buscar">
          <Search />
        </Button>
        <PrivacyToggle />
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <Menu />
        </Button>
      </div>
    </header>
  );
}
