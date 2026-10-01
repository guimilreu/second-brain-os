"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { MOBILE_NAV, isNavActive } from "@/components/layout/nav";
import { NewEntryButton } from "@/components/layout/NewEntryButton";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const itemClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-semibold transition-colors";

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
        className={cn(itemClass, active ? "text-primary-ink" : "text-muted-foreground")}
      >
        <Icon className="size-5" />
        {item.label}
      </Link>
    );
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      aria-label="Navegação rápida"
    >
      {renderLink(first)}
      {renderLink(second)}
      <div className="flex flex-1 justify-center">
        <NewEntryButton variant="fab" />
      </div>
      {renderLink(third)}
      <button type="button" onClick={() => setSidebarOpen(true)} className={cn(itemClass, "text-muted-foreground")}>
        <MoreHorizontal className="size-5" />
        Mais
      </button>
    </nav>
  );
}
