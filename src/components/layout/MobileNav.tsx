"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { MOBILE_NAV, isNavActive } from "@/components/layout/nav";
import { NewEntryButton } from "@/components/layout/NewEntryButton";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const itemClass =
  "flex flex-1 flex-col items-center justify-center gap-1 text-[0.625rem] font-medium transition-colors";

/** Barra flutuante do celular: pílula de vidro com o "+" brilhando no meio. */
export function MobileNav() {
  const pathname = usePathname();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const [first, second, third] = MOBILE_NAV;

  function renderLink(item: (typeof MOBILE_NAV)[number]) {
    const active = isNavActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(itemClass, active ? "text-foreground" : "text-muted-foreground")}
      >
        <Icon className={cn("size-5", active && "text-primary-ink drop-shadow-[0_0_8px_var(--primary)]")} />
        {item.label}
      </Link>
    );
  }

  return (
    <nav
      className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex h-16 items-center rounded-full px-2 shadow-lg sm:hidden"
      aria-label="Navegação rápida"
    >
      {renderLink(first)}
      {renderLink(second)}
      <div className="flex flex-1 justify-center">
        <NewEntryButton variant="fab" />
      </div>
      {renderLink(third)}
      <button type="button" onClick={() => setSidebarOpen(true)} className={cn(itemClass, "text-muted-foreground")}>
        <Menu className="size-5" />
        Mais
      </button>
    </nav>
  );
}
