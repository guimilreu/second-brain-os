"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Landmark, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { AccountDialog } from "@/features/finance/components/dialogs/AccountDialog";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  color: string;
};

const TYPE_LABELS: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira",
  investment: "Investimento",
  credit: "Cartão de crédito",
};

export function AccountsSection() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const fetch = useCallback(async () => {
    const res = await axios.get<{ data: Account[] }>("/api/finance/accounts");
    setAccounts(res.data.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetch(); }, [fetch]);

  async function handleDelete(id: string) {
    if (!confirm("Remover esta conta?")) return;
    try {
      await axios.delete(`/api/finance/accounts/${id}`);
      toast.success("Conta removida.");
      void fetch();
    } catch {
      toast.error("Erro ao remover a conta.");
    }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setDialogOpen(true);
  }

  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Contas e bancos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {accounts.length} conta{accounts.length !== 1 ? "s" : ""} · total{" "}
            <span className="font-medium text-foreground">{formatCurrency(total)}</span>
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nova conta
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-surface h-40 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-surface flex flex-col items-center gap-4 rounded-[2rem] py-16 text-center">
          <div className="rounded-3xl bg-brand-soft p-4 text-brand">
            <Landmark className="h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold">Nenhuma conta cadastrada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione seus bancos e carteiras para acompanhar seus saldos.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Adicionar conta
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <div key={account.id} className="glass-surface group relative rounded-[2rem] p-5">
              <div className="flex items-start justify-between gap-4">
                <div
                  className="rounded-2xl p-3"
                  style={{ backgroundColor: `${account.color}20` }}
                >
                  <Wallet className="h-5 w-5" style={{ color: account.color }} />
                </div>
                <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(account)}
                    className="rounded-xl bg-surface-soft p-2 text-muted-foreground transition hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="rounded-xl bg-surface-soft p-2 text-muted-foreground transition hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <p className="font-semibold">{account.name}</p>
                <p className="text-sm text-muted-foreground">{account.institution}</p>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    "bg-surface-soft text-muted-foreground",
                  )}
                >
                  {TYPE_LABELS[account.type] ?? account.type}
                </span>
                <p className="text-xl font-semibold">{formatCurrency(account.balance)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AccountDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        account={editing}
        onSaved={() => {
          setDialogOpen(false);
          void fetch();
        }}
      />
    </div>
  );
}
