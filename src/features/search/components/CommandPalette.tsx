"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Landmark,
  ListTodo,
  Search,
  ShoppingBag,
  Target,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/FormField";
import { useActionStore } from "@/stores/action-store";
import type { SearchResultGroup } from "@/features/search/lib/search";

const DOMAIN_ICONS: Record<string, typeof Search> = {
  tasks: ListTodo,
  transactions: Landmark,
  wishlist: ShoppingBag,
  projects: ListTodo,
  pots: Wallet,
  goals: Target,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultGroup[]>([]);
  const { openTransaction, openTask, openWishlist } = useActionStore();

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await axios.get<{ data: SearchResultGroup[] }>(
        `/api/search?q=${encodeURIComponent(q)}`,
      );
      setResults(res.data.data);
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void runSearch(query), 200);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Buscar"
      description="⌘K — tarefas, transações, compras, metas"
      size="lg"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar..."
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <button
            type="button"
            className="rounded-xl bg-surface-soft px-3 py-1.5 text-xs font-semibold"
            onClick={() => {
              setOpen(false);
              openTransaction();
            }}
          >
            + Transação
          </button>
          <button
            type="button"
            className="rounded-xl bg-surface-soft px-3 py-1.5 text-xs font-semibold"
            onClick={() => {
              setOpen(false);
              openTask();
            }}
          >
            + Tarefa
          </button>
          <button
            type="button"
            className="rounded-xl bg-surface-soft px-3 py-1.5 text-xs font-semibold"
            onClick={() => {
              setOpen(false);
              openWishlist();
            }}
          >
            + Desejo
          </button>
        </div>

        <div className="max-h-72 space-y-4 overflow-y-auto">
          {query.length >= 2 && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>
          ) : null}
          {results.map((group) => {
            const Icon = DOMAIN_ICONS[group.domain] ?? Search;
            return (
              <div key={group.domain}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className="paper-row flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                      {item.subtitle ? (
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
