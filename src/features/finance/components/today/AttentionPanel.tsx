"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { dayInMonth } from "@/features/finance/domain/dates";
import type { Insight, InsightAction, InsightTone } from "@/features/finance/domain/insights";
import { invoiceLabel } from "@/features/finance/domain/labels";
import { occurrenceDate } from "@/features/finance/domain/recurring";
import type { Account, DateStr, Recurring } from "@/features/finance/domain/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { useEntryStore, type EntryDraft } from "@/stores/entry-store";
import {
  ConfirmOccurrenceDialog,
  useOccurrenceDialog,
} from "@/features/finance/components/recurring/ConfirmOccurrenceDialog";

const VISIBLE = 5;

const TONES: Record<InsightTone, { icon: LucideIcon; className: string }> = {
  negative: { icon: CircleAlert, className: "bg-negative/12 text-negative" },
  warning: { icon: TriangleAlert, className: "bg-warning/15 text-warning" },
  info: { icon: Info, className: "bg-info/12 text-info" },
  positive: { icon: CircleCheck, className: "bg-positive/12 text-positive" },
};

type AttentionPanelProps = {
  insights: Insight[];
  accounts: Account[];
  recurrings: Recurring[];
  today: DateStr;
};

/** Atalho do aviso no formulário único de lançamento (sempre uma transferência). */
function draftFor(action: InsightAction, accounts: Account[], currentYear: number): EntryDraft | null {
  const nameOf = (id: string) => accounts.find((account) => account.id === id)?.name ?? "reserva";
  switch (action.kind) {
    case "reserve":
      return {
        type: "transfer",
        accountId: action.fromAccountId ?? undefined,
        toAccountId: action.toAccountId,
        amountCents: action.amountCents,
        description: "Guardar para a fatura",
        title: `Guardar em ${nameOf(action.toAccountId)}`,
      };
    case "pay-invoice":
      return {
        type: "transfer",
        accountId: action.fromAccountId ?? undefined,
        toAccountId: action.cardId,
        amountCents: action.amountCents,
        invoiceMonth: action.month,
        description: `Pagamento da ${invoiceLabel(action.month, currentYear).toLowerCase()}`,
        title: `Pagar ${invoiceLabel(action.month, currentYear).toLowerCase()}`,
      };
    case "move-money": {
      const label = `${isSavingTarget(action, accounts) ? "Guardar em" : "Mover para"} ${nameOf(action.toAccountId)}`;
      return {
        type: "transfer",
        accountId: action.fromAccountId,
        toAccountId: action.toAccountId,
        amountCents: action.amountCents,
        description: label,
        title: label,
      };
    }
    default:
      return null;
  }
}

/** Dinheiro indo para uma meta é "guardar"; entre contas do dia a dia é "mover". */
function isSavingTarget(action: InsightAction, accounts: Account[]) {
  if (action.kind !== "move-money") return false;
  const purpose = accounts.find((account) => account.id === action.toAccountId)?.purpose;
  return purpose === "goal" || purpose === "savings";
}

const ACTION_LABELS: Record<InsightAction["kind"], string> = {
  reserve: "Guardar",
  "pay-invoice": "Pagar",
  "move-money": "Mover",
  "confirm-recurring": "Confirmar",
  reconcile: "Conferir",
};

/** "O que fazer agora": avisos do sistema, cada um com o atalho que resolve. */
export function AttentionPanel({ insights, accounts, recurrings, today }: AttentionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const openNew = useEntryStore((state) => state.openNew);
  const occurrenceDialog = useOccurrenceDialog();
  const currentYear = Number(today.slice(0, 4));
  const visible = expanded ? insights : insights.slice(0, VISIBLE);

  function runAction(action: InsightAction) {
    if (action.kind === "confirm-recurring") {
      const recurring = recurrings.find((item) => item.id === action.recurringId);
      if (!recurring) return;
      occurrenceDialog.openFor({
        recurring,
        month: action.month,
        date: occurrenceDate(recurring, action.month) ?? dayInMonth(action.month, recurring.dayOfMonth),
        amountCents: action.amountCents,
      });
      return;
    }
    const draft = draftFor(action, accounts, currentYear);
    if (draft) openNew(draft);
  }

  return (
    <Panel
      title="Atenção"
      description={
        insights.length
          ? `${insights.length} ${insights.length === 1 ? "coisa pede" : "coisas pedem"} um olhar`
          : undefined
      }
      padded={false}
    >
      {insights.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-positive/12 text-positive">
            <CircleCheck className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Tudo em dia</p>
            <p className="text-[0.8125rem] text-muted-foreground">Nada pedindo atenção agora.</p>
          </div>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {visible.map((insight) => {
              const tone = TONES[insight.tone];
              const Icon = tone.icon;
              const action = insight.action;
              const showLink = insight.href && action?.kind !== "reconcile";
              return (
                <li
                  key={insight.id}
                  className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone.className)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-balance">{insight.title}</p>
                      {insight.detail ? (
                        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{insight.detail}</p>
                      ) : null}
                    </div>
                  </div>
                  {action || showLink ? (
                    <div className="flex shrink-0 items-center gap-1.5 pl-11 sm:pl-0">
                      {action?.kind === "reconcile" ? (
                        <Link
                          href="/accounts?reconcile=1"
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {ACTION_LABELS.reconcile}
                        </Link>
                      ) : action ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runAction(action)}
                        >
                          {isSavingTarget(action, accounts) ? "Guardar" : ACTION_LABELS[action.kind]}
                        </Button>
                      ) : null}
                      {showLink && insight.href ? (
                        <Link
                          href={insight.href}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          Ver
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {insights.length > VISIBLE ? (
            <div className="border-t border-border px-5 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2.5"
                onClick={() => setExpanded((current) => !current)}
                aria-expanded={expanded}
              >
                {expanded ? "Mostrar menos" : `Ver todos (${insights.length})`}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmOccurrenceDialog
        {...occurrenceDialog.dialogProps}
        today={today}
        accounts={accounts}
      />
    </Panel>
  );
}
