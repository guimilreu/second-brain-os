"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Landmark, Pencil, Plus, Trash2, Wallet, ArrowRightLeft } from "lucide-react";
import { AccountDialog } from "@/features/finance/components/dialogs/AccountDialog";
import { TransferDialog } from "@/features/finance/components/dialogs/TransferDialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  availableBalance?: number;
  color: string;
  closingDay?: number;
  dueDay?: number;
  safeMinimum?: number;
};

type Pot = {
  id: string;
  name: string;
  bankAccountId?: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
};

const TYPE_LABELS: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira",
  investment: "Investimento",
  credit: "Cartão de crédito",
  loan: "Empréstimo",
};

export function AccountsSection() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pots, setPots] = useState<Pot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<string | undefined>();
  const [editing, setEditing] = useState<Account | null>(null);

  const fetch = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        axios.get<{ data: Account[] }>("/api/finance/accounts"),
        axios.get<{ data: Pot[] }>("/api/finance/savings-pots"),
      ]);
      setAccounts(a.data.data);
      setPots(p.data.data);
    } catch {
      toast.error("Não foi possível carregar contas e cofrinhos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void fetch();
    });
  }, [fetch]);

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

  const total = accounts.reduce((s, x) => s + x.balance, 0);

  const potsByAccount = (accountId: string) =>
    pots.filter((pot) => pot.bankAccountId === accountId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Contas e bancos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {accounts.length} conta{accounts.length !== 1 ? "s" : ""} · total{" "}
            <span className="font-medium text-foreground">{formatCurrency(total)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => {
              setTransferFrom(undefined);
              setTransferOpen(true);
            }}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Mover dinheiro
          </Button>
          <Button onClick={openCreate} className="rounded-2xl">
            <Plus className="h-4 w-4" />
            Nova conta
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl border border-border bg-card" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card py-16 text-center shadow-paper-sm">
          <div className="rounded-3xl bg-brand-soft p-4 text-brand">
            <Landmark className="h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold">Nenhuma conta cadastrada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione seus bancos e carteiras para acompanhar seus saldos.
            </p>
          </div>
          <Button onClick={openCreate} className="rounded-2xl">
            <Plus className="h-4 w-4" />
            Adicionar conta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => {
            const accPots = potsByAccount(account.id);
            const free =
              account.availableBalance !== undefined
                ? account.availableBalance
                : account.balance -
                  accPots.reduce((s, pot) => s + pot.currentAmount, 0);
            const potProgress = (pot: Pot) =>
              pot.targetAmount > 0
                ? Math.min((pot.currentAmount / pot.targetAmount) * 100, 100)
                : 0;
            return (
              <div key={account.id} className="paper-note interactive-card group relative rounded-3xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="rounded-2xl p-3"
                    style={{ backgroundColor: `${account.color}20` }}
                  >
                    <Wallet className="h-5 w-5" style={{ color: account.color }} />
                  </div>
                  <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => {
                        setTransferFrom(account.id);
                        setTransferOpen(true);
                      }}
                      className="rounded-xl"
                      title="Mover dinheiro"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => openEdit(account)}
                      className="rounded-xl"
                      aria-label="Editar conta"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => handleDelete(account.id)}
                      className="rounded-xl hover:text-red-600"
                      aria-label="Remover conta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-muted-foreground">{account.institution}</p>
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      "bg-surface-soft text-muted-foreground",
                    )}
                  >
                    {TYPE_LABELS[account.type] ?? account.type}
                  </span>
                  <div className="text-right">
                    <p className="text-xl font-semibold">{formatCurrency(account.balance)}</p>
                    {account.type !== "credit" && (
                      <p className="text-xs text-muted-foreground">
                        Livre {formatCurrency(Math.max(0, free))}
                      </p>
                    )}
                  </div>
                </div>
                {accPots.length > 0 && account.type !== "credit" && (
                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Cofrinhos</p>
                    {accPots.map((pot) => (
                      <div key={pot.id}>
                        <div className="flex justify-between text-xs">
                          <span>{pot.name}</span>
                          <span>{formatCurrency(pot.currentAmount)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-soft">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${potProgress(pot)}%`,
                              backgroundColor: pot.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
      <TransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        defaultFromAccountId={transferFrom}
        onSaved={() => void fetch()}
      />
    </div>
  );
}
