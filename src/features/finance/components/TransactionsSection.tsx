"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import axios from "axios";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Pencil, Plus, Receipt, ShoppingBag, Trash2 } from "lucide-react";
import { InstallmentDialog } from "@/features/finance/components/dialogs/InstallmentDialog";
import { TransactionDialog } from "@/features/finance/components/dialogs/TransactionDialog";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EntityChip } from "@/components/ui/EntityChip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentReveal } from "@/components/motion/ContentReveal";
import { StaggerItem, StaggerList } from "@/components/motion/StaggerList";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Account = { id: string; name: string; type?: string };

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
  wishlistItemId?: string;
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
  const confirm = useConfirm();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [txRes, acRes] = await Promise.all([
        axios.get<{ data: Transaction[] }>("/api/finance/transactions"),
        axios.get<{ data: Account[] }>("/api/finance/accounts"),
      ]);
      setTransactions(txRes.data.data);
      setAccounts(acRes.data.data);
    } catch {
      toast.error("Não foi possível carregar transações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void fetchAll();
    });
  }, [fetchAll]);

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Remover transação?",
      destructive: true,
      confirmLabel: "Remover",
    });
    if (!ok) return;
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
              <Button
                key={f}
                type="button"
                size="sm"
                variant={typeFilter === f ? "default" : "ghost"}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "rounded-xl",
                  typeFilter !== f && "text-muted-foreground",
                )}
              >
                {f === "all" ? "Todos" : f === "income" ? "Entradas" : "Saídas"}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setInstallmentOpen(true)}
            className="rounded-2xl"
          >
            <CreditCard className="h-4 w-4" />
            Parcelamento
          </Button>
          <Button onClick={openCreate} className="rounded-2xl">
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </div>
      </div>

      <ContentReveal loading={loading} skeleton="row" count={4}>
        {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma transação"
          description="Registre entradas e saídas para acompanhar seu dinheiro."
          actionLabel="Registrar transação"
          onAction={openCreate}
        />
      ) : (
        <StaggerList className="overflow-hidden rounded-3xl border border-border bg-card shadow-paper-sm">
          {filtered.map((t, i) => (
            <StaggerItem
              key={t.id}
              className={cn(
                "group flex flex-wrap items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-surface-soft sm:flex-nowrap",
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
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {t.category} ·{" "}
                    {format(new Date(t.occurredAt), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  {t.wishlistItemId ? (
                    <EntityChip
                      href="/wishlist"
                      label="Lista de desejos"
                      icon={<ShoppingBag className="h-3 w-3" />}
                    />
                  ) : null}
                </div>
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
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => openEdit(t)}
                  className="rounded-xl"
                  aria-label="Editar transação"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => handleDelete(t.id)}
                  className="rounded-xl hover:text-danger"
                  aria-label="Remover transação"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
      </ContentReveal>

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

      <InstallmentDialog
        open={installmentOpen}
        onClose={() => setInstallmentOpen(false)}
        accounts={accounts}
        onSaved={() => {
          setInstallmentOpen(false);
          void fetchAll();
        }}
      />
    </div>
  );
}
