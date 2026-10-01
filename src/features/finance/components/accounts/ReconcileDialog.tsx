"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { useAction } from "@/features/finance/components/shared/useAction";
import { diffDays } from "@/features/finance/domain/dates";
import { relativeDays } from "@/features/finance/domain/labels";
import { parseMoneyInput } from "@/features/finance/domain/money";
import type { Cents, DateStr } from "@/features/finance/domain/types";
import { reconcileAccounts } from "@/features/finance/server/actions";
import { centsToInput, formatCents } from "@/lib/utils/format";
import { AccountIcon, MoneyInput } from "./fields";
import type { AccountItem } from "./overview";

type ReconcileDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Contas e cofres ativos (cartão tem conferência própria, na fatura). */
  items: AccountItem[];
  today: DateStr;
};

function describe(yieldCents: Cents, adjustments: number): string | null {
  const parts: string[] = [];
  if (yieldCents > 0) parts.push(`${formatCents(yieldCents)} de rendimento`);
  if (adjustments > 0) parts.push(`${adjustments} ${adjustments === 1 ? "ajuste" : "ajustes"} de saldo`);
  return parts.length ? parts.join(" e ") : null;
}

/** Conferência semanal: o saldo de cada app contra o do sistema; a diferença vira lançamento. */
export function ReconcileDialog({ open, onClose, items, today }: ReconcileDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((item) => [item.account.id, centsToInput(item.balanceCents)])),
  );
  const { pending, execute } = useAction();

  const rows = items.map((item) => {
    const text = values[item.account.id] ?? centsToInput(item.balanceCents);
    const realCents = parseMoneyInput(text);
    const diffCents = realCents === null ? null : realCents - item.balanceCents;
    const isYield = diffCents !== null && diffCents > 0 && Boolean(item.account.yieldCdiPct);
    return { item, text, realCents, diffCents, isYield };
  });
  const yieldCents = rows.reduce((total, row) => total + (row.isYield ? (row.diffCents ?? 0) : 0), 0);
  const adjustments = rows.filter((row) => row.diffCents && !row.isYield).length;
  const summary = describe(yieldCents, adjustments);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: { accountId: string; realBalanceCents: Cents }[] = [];
    for (const row of rows) {
      if (row.realCents === null) {
        toast.error(`Informe o saldo de ${row.item.account.name}.`);
        return;
      }
      payload.push({ accountId: row.item.account.id, realBalanceCents: row.realCents });
    }
    void execute(() => reconcileAccounts({ items: payload }), {
      success: summary ? `Conferido: ${summary}.` : "Tudo batendo. Conferência registrada.",
      onSuccess: onClose,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Conferir saldos"
      description="Digite o saldo que cada app mostra agora. Sobrou em conta que rende? Vira Rendimento. Outras diferenças viram Ajuste de saldo."
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate>
        <ul className="-mt-1 divide-y divide-border">
          {rows.map(({ item, text, diffCents, isYield }) => {
            const { account } = item;
            const checked = account.lastReconciledAt
              ? `conferido ${relativeDays(diffDays(today, account.lastReconciledAt))}`
              : "nunca conferido";
            return (
              <li key={account.id} className="py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <AccountIcon kind={account.kind} color={account.color} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        No sistema <Money cents={item.balanceCents} /> · {checked}
                      </p>
                    </div>
                  </div>
                  <div className="sm:w-40">
                    <MoneyInput
                      value={text}
                      onValueChange={(value) => setValues((current) => ({ ...current, [account.id]: value }))}
                      aria-label={`Saldo de ${account.name} no app`}
                      className="h-10 text-right"
                    />
                  </div>
                </div>
                <div className="mt-1.5 text-xs sm:pl-10">
                  {diffCents === null ? (
                    <p className="text-negative">Valor inválido.</p>
                  ) : diffCents === 0 ? (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Check className="size-3" />
                      Bate com o sistema
                    </p>
                  ) : (
                    <p>
                      <Money cents={diffCents} signed className="font-semibold" />
                      <span className="text-muted-foreground"> · {isYield ? "vira Rendimento" : "Ajuste de saldo"}</span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t border-border bg-popover">
          <div className="flex flex-col gap-3 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.8125rem] text-muted-foreground">
              {summary ? `Vai lançar ${summary}.` : "Tudo bate com os apps."}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Confirmar conferência
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
