"use client";

import { LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { NAV_SECTIONS, isNavActive } from "@/components/layout/nav";
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Sessão encerrada.");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <span className="grid size-7 place-items-center rounded-md bg-primary text-[0.6875rem] font-extrabold text-primary-foreground">
          SB
        </span>
        <span className="text-sm font-bold tracking-tight">Second Brain</span>
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3 scrollbar-none" aria-label="Navegação principal">
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.label ?? index} className="space-y-0.5">
            {section.label ? (
              <p className="px-2 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                {section.label}
              </p>
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
                    "flex h-8 items-center gap-2.5 rounded-md px-2 text-[0.8125rem] font-semibold transition-colors",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4", active && "text-primary")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-sidebar-border p-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
          {initials(userName)}
        </span>
        <p className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{userName}</p>
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent userName={userName} />
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 animate-in fade-in-0"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-sidebar-border bg-sidebar shadow-lg animate-in slide-in-from-left duration-200">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3"
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
