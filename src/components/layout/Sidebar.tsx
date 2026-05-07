"use client";

import {
  Brain,
  ChevronRight,
  CheckSquare,
  ShoppingBag,
  Home,
  Landmark,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/finance", label: "Financeiro", icon: Landmark },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/wishlist", label: "Lista de desejos", icon: ShoppingBag },
] as const;

type SidebarProps = {
  userName: string;
};

function SidebarContent({ userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Sessão encerrada.");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col p-4">
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Link
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-primary to-primary-700 p-4 text-white shadow-xl shadow-primary/25"
        >
          <span className="rounded-2xl bg-white/15 p-2 backdrop-blur-sm">
            <Brain className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-sm font-medium text-white/75">GM OS</span>
            <span className="block text-lg font-semibold tracking-tight">Second Brain</span>
          </span>
        </Link>
      </motion.div>

      <nav className="mt-8 space-y-1">
        {NAV_ITEMS.map((item, index) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.08, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "bg-brand-soft text-brand shadow-sm shadow-brand/10 dark:bg-primary/15 dark:text-primary"
                    : "text-muted-foreground hover:bg-surface-soft hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />
                  {item.label}
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition duration-200 group-hover:translate-x-0.5",
                    isActive ? "opacity-100 text-brand dark:text-primary" : "opacity-0",
                  )}
                />
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-6">
        <motion.div
          layout
          className="rounded-3xl border border-border bg-surface/90 p-4 backdrop-blur-md dark:bg-default-50/40"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Logado como</p>
          <p className="mt-2 font-medium">{userName}</p>
        </motion.div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-danger hover:text-danger dark:bg-default-50/30"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ userName }: SidebarProps) {
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 border-r border-border bg-background/85 backdrop-blur-xl lg:block">
        <SidebarContent userName={userName} />
      </aside>

      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface shadow-lg dark:bg-default-50/40 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {isSidebarOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
            />
            <motion.aside
              initial={{ x: "-104%" }}
              animate={{ x: 0 }}
              exit={{ x: "-104%" }}
              transition={{ type: "spring", damping: 30, stiffness: 380 }}
              className="absolute inset-y-0 left-0 flex w-[86vw] max-w-80 flex-col border-r border-border bg-background shadow-2xl"
            >
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.12 }}
                onClick={() => setSidebarOpen(false)}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-soft dark:bg-default-100/40"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </motion.button>
              <SidebarContent userName={userName} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
