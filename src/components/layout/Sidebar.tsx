"use client";

import { LogOut, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrandMark } from "@/components/layout/BrandMark";
import { NAV_SECTIONS, isNavActive } from "@/components/layout/nav";
import { NewEntryButton } from "@/components/layout/NewEntryButton";
import { PrivacyToggle } from "@/components/layout/PrivacyToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

type SidebarProps = {
  userName: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SidebarContent({ userName, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Sessão encerrada.");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col p-3">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-2 pt-1 pb-4">
        <BrandMark />
        <span className="leading-tight">
          <span className="block text-[0.9375rem] font-semibold tracking-tight">Second Brain</span>
          <span className="block text-[0.6875rem] text-muted-foreground">suas finanças, no ritmo</span>
        </span>
      </Link>

      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          setCommandOpen(true);
        }}
        className="mb-2 flex h-10 items-center gap-2 rounded-full bg-foreground/[0.05] px-3.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-foreground/[0.09] hover:text-foreground"
      >
        <Search className="size-4" />
        Buscar
        <kbd className="ml-auto rounded-full bg-foreground/[0.08] px-2 py-0.5 font-mono text-[0.625rem]">⌘K</kbd>
      </button>

      <div className="mb-4" onClick={onNavigate}>
        <NewEntryButton variant="wide" />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto scrollbar-none" aria-label="Navegação principal">
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.label ?? index} className="space-y-1">
            {section.label ? (
              <p className="px-3.5 pb-0.5 text-[0.6875rem] font-medium text-muted-foreground/70">{section.label}</p>
            ) : null}
            {section.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-10 items-center gap-3 rounded-full px-3.5 text-[0.875rem] font-medium transition-[background-color,color] duration-200",
                    active
                      ? "bg-foreground/[0.08] text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[1.125rem] transition-colors",
                      active ? "text-primary-ink drop-shadow-[0_0_8px_var(--primary)]" : "group-hover:text-foreground",
                    )}
                  />
                  {item.label}
                  {active ? (
                    <span className="ml-auto size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-3 flex items-center gap-1 rounded-full bg-foreground/[0.04] p-1">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#9b87ff,#ff5ca8)] text-[0.6875rem] font-bold text-white">
          {initials(userName)}
        </span>
        <p className="min-w-0 flex-1 truncate px-1 text-[0.8125rem] font-medium">{userName}</p>
        <PrivacyToggle size="icon-sm" />
        <ThemeToggle size="icon-sm" />
        <Button variant="ghost" size="icon-sm" onClick={handleLogout} aria-label="Sair" title="Sair">
          <LogOut />
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ userName }: SidebarProps) {
  const isOpen = useUiStore((state) => state.isSidebarOpen);
  const setOpen = useUiStore((state) => state.setSidebarOpen);

  return (
    <>
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-[15.5rem] rounded-[1.75rem] shadow-lg lg:block">
        <SidebarContent userName={userName} />
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-in fade-in-0"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />
          <aside className="glass absolute inset-y-3 left-3 w-72 max-w-[85vw] rounded-[1.75rem] shadow-lg animate-in slide-in-from-left duration-300">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X />
            </Button>
            <SidebarContent userName={userName} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
