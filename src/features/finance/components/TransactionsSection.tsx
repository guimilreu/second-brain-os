"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import axios from "axios";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { TransactionDialog } from "@/features/finance/components/dialogs/TransactionDialog";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Account = { id: string; name: string };

type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string;
  bankAccountId?: string;
  status: string;
  occurredAt: string;
  notes: string;
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-success",
  planned: "bg-blue-500/10 text-blue-500",
  late: "bg-red-500/10 text-danger",
  cancelled: "bg-surface-soft text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmado",
  planned: "Planejado",
  late: "Atrasado",
  cancelled: "Cancelado",
};

export function TransactionsSection() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const fetchAll = useCallback(async () => {
    const [txRes, acRes] = await Promise.all([
      axios.get<{ data: Transaction[] }>("/api/finance/transactions"),
      axios.get<{ data: Account[] }>("/api/finance/accounts"),
    ]);
    setTransactions(txRes.data.data);
    setAccounts(acRes.data.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function handleDelete(id: string) {
    if (!confirm("Remover esta transação?")) return;
    try {
      await axios.delete(`/api/finance/transactions/${id}`);
      toast.success("Transação removida.");
      void fetchAll();
    } catch {
      toast.error("Erro ao remover.");
    }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setDialogOpen(true);
  }

  const filtered = transactions.filter((t) => typeFilter === "all" || t.type === typeFilter);

  const totalIn = transactions
    .filter((t) => t.type === "income" && t.status !== "cancelled")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions
    .filter((t) => t.type === "expense" && t.status !== "cancelled")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Transações</h2>
          <div className="mt-1 flex gap-4 text-sm">
            <span className="text-success">+{formatCurrency(totalIn)}</span>
            <span className="text-danger">−{formatCurrency(totalOut)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-2xl border border-border bg-surface-soft p-1 text-sm">
            {(["all", "income", "expense"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "rounded-xl px-3 py-1.5 font-medium transition",
                  typeFilter === f ? "bg-brand text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "Todos" : f === "income" ? "Entradas" : "Saídas"}
              </button>
            ))}
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nova
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-surface h-16 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-surface flex flex-col items-center gap-4 rounded-[2rem] py-16 text-center">
          <div className="rounded-3xl bg-brand-soft p-4 text-brand">
            <Receipt className="h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold">Nenhuma transação</p>
            <p className="mt-1 text-sm text-muted-foreground">Registre entradas e saídas para acompanhar seu dinheiro.</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Registrar transação
          </button>
        </div>
      ) : (
        <div className="glass-surface overflow-hidden rounded-[2rem]">
          {filtered.map((t, i) => (
            <div
              key={t.id}
              className={cn(
                "group flex items-center gap-4 px-5 py-4 transition hover:bg-surface-soft",
                i > 0 && "border-t border-border",
              )}
            >
              <div
                className={cn(
                  "rounded-2xl p-2.5",
                  t.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10",
                )}
              >
                {t.type === "income" ? (
                  <ArrowUpRight className="h-4 w-4 text-success" />
                ) : (
                  <ArrowDownLeft className="h-4 w-4 text-danger" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.title}</p>
                <p className="text-sm text-muted-foreground">
                  {t.category} ·{" "}
                  {format(new Date(t.occurredAt), "dd MMM yyyy", { locale: ptBR })}
                </p>
              </div>
              <span
                className={cn(
                  "hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline",
                  STATUS_STYLE[t.status] ?? "bg-surface-soft text-muted-foreground",
                )}
              >
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
              <p
                className={cn(
                  "font-semibold tabular-nums",
                  t.type === "income" ? "text-success" : "text-danger",
                )}
              >
                {t.type === "income" ? "+" : "−"}
                {formatCurrency(t.amount)}
              </p>
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => openEdit(t)}
                  className="rounded-xl bg-surface-soft p-2 text-muted-foreground transition hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="rounded-xl bg-surface-soft p-2 text-muted-foreground transition hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TransactionDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        transaction={editing}
        accounts={accounts}
        onSaved={() => {
          setDialogOpen(false);
          void fetchAll();
        }}
      />
    </div>
  );
}
