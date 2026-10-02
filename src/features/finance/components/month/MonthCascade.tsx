"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, CircleDashed, Info } from "lucide-react";
import { dayMonth, monthName } from "@/features/finance/domain/labels";
import type { MonthPlan } from "@/features/finance/domain/plan";
import type { Account, Cents, DateStr } from "@/features/finance/domain/types";
import {
  ConfirmOccurrenceDialog,
  useOccurrenceDialog,
  type OccurrenceTarget,
} from "@/features/finance/components/recurring/ConfirmOccurrenceDialog";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/utils/format";
import { useEntryStore } from "@/stores/entry-store";
import type { CascadeEntry, InstallmentEntry, MonthDetails, SavingsEntry } from "./monthView";

type MonthCascadeProps = {
  plan: MonthPlan;
  details: MonthDetails;
  accounts: Account[];
  today: DateStr;
};

const joinParts = (parts: (string | false | null | undefined)[], empty: string) =>
  parts.filter(Boolean).join(" · ") || empty;

/** A conta do mês como cascata: cada linha abre os itens que formam o valor. */
export function MonthCascade({ plan, details, accounts, today }: MonthCascadeProps) {
  const occurrenceDialog = useOccurrenceDialog();
  const { income, fixed, savings } = plan;
  const lateFixed = details.fixed.filter((entry) => entry.state === "late").length;
  const pendingSavings = Math.max(savings.plannedCents - savings.depositedCents, 0);
  const freeLabel = plan.isPast
    ? plan.freeCents < 0
      ? "Faltou"
      : "Sobrou"
    : plan.isCurrent
      ? "Ainda pode gastar"
      : "Livre previsto";

  return (
    <Panel
      title="A conta do mês"
      description="Toque numa linha para ver o que tem dentro."
      padded={false}
    >
      <div className="divide-y divide-border">
        <Step
          id="entradas"
          operator="+"
          label="Entradas"
          hint={joinParts(
            [
              income.receivedCents > 0 && `${formatCents(income.receivedCents)} recebidas`,
              income.expectedCents > 0 && `${formatCents(income.expectedCents)} previstas`,
            ],
            "Nada neste mês",
          )}
          cents={income.totalCents}
        >
          {details.income.length ? (
            <EntryList
              entries={details.income}
              isIncome
              today={today}
              onConfirm={occurrenceDialog.openFor}
            />
          ) : null}
        </Step>

        <Step
          id="fixas"
          operator="−"
          label="Fixas"
          hint={
            <>
              {joinParts(
                [
                  fixed.paidCents > 0 && `${formatCents(fixed.paidCents)} pagas`,
                  fixed.expectedCents > 0 && `${formatCents(fixed.expectedCents)} previstas`,
                ],
                "Nada neste mês",
              )}
              {lateFixed ? (
                <span className="text-warning">
                  {" "}
                  · {lateFixed} sem confirmar
                </span>
              ) : null}
            </>
          }
          cents={fixed.totalCents}
        >
          {details.fixed.length ? (
            <EntryList
              entries={details.fixed}
              isIncome={false}
              today={today}
              onConfirm={occurrenceDialog.openFor}
            />
          ) : null}
        </Step>

        <Step
          id="parcelas"
          operator="−"
          label="Parcelas"
          hint={
            details.installments.length
              ? `${details.installments.length} ${details.installments.length === 1 ? "parcela" : "parcelas"} no cartão`
              : "Nenhuma parcela neste mês"
          }
          cents={plan.installmentsCents}
        >
          {details.installments.length ? <InstallmentList entries={details.installments} /> : null}
        </Step>

        <Step
          id="guardar"
          operator={savings.totalCents < 0 ? "+" : "−"}
          label={savings.totalCents < 0 ? "Resgatado das metas" : "Guardar"}
          hint={joinParts(
            [
              savings.depositedCents > 0 && `${formatCents(savings.depositedCents)} guardados`,
              pendingSavings > 0 && `falta ${formatCents(pendingSavings)}`,
              savings.withdrawnCents > 0 && `${formatCents(savings.withdrawnCents)} resgatados`,
            ],
            details.goalsWithoutMonthly.length
              ? `${details.goalsWithoutMonthly.join(", ")} sem valor mensal — defina em Contas e cofres`
              : "Nenhuma meta para este mês",
          )}
          cents={Math.abs(savings.totalCents)}
        >
          {details.savings.length ? (
            <SavingsList
              entries={details.savings}
              pendingCents={pendingSavings}
            />
          ) : null}
        </Step>

        <ResultRow
          label="Para o dia a dia"
          hint="O que sobra depois do que já está comprometido."
          cents={plan.availableCents}
        />

        <Link
          id="gasto"
          href={`/transactions?month=${plan.month}`}
          className="flex scroll-mt-20 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-foreground/[0.03]"
        >
          <Operator symbol={plan.variableCents < 0 ? "+" : "−"} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Gasto do dia a dia</span>
            <span className="block truncate text-xs text-muted-foreground">
              Tudo fora das fixas e parcelas, já sem os estornos
            </span>
          </span>
          <Money
            cents={Math.abs(plan.variableCents)}
            className="text-sm font-semibold"
          />
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>

        <ResultRow
          label={freeLabel}
          cents={plan.freeCents}
          strong
        />
      </div>

      <p className="flex items-start gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" />
        Compras no cartão contam no mês da fatura: o que você compra depois do fechamento já entra no mês seguinte.
      </p>

      <ConfirmOccurrenceDialog
        {...occurrenceDialog.dialogProps}
        today={today}
        accounts={accounts}
      />
    </Panel>
  );
}

function Operator({ symbol }: { symbol: "+" | "−" | "=" }) {
  return (
    <span
      aria-hidden
      className="num grid size-6 shrink-0 place-items-center rounded-md bg-muted text-sm font-semibold text-muted-foreground"
    >
      {symbol}
    </span>
  );
}

type StepProps = {
  id: string;
  operator: "+" | "−";
  label: string;
  hint: React.ReactNode;
  cents: Cents;
  /** Itens da linha; sem itens a linha não abre. */
  children: React.ReactNode;
};

function Step({ id, operator, label, hint, cents, children }: StepProps) {
  const [open, setOpen] = useState(false);
  const expandable = Boolean(children);
  const header = (
    <>
      <Operator symbol={operator} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <Money
        cents={cents}
        className="text-sm font-semibold"
      />
      {expandable ? (
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      ) : (
        <span
          aria-hidden
          className="size-4 shrink-0"
        />
      )}
    </>
  );

  return (
    <div
      id={id}
      className="scroll-mt-20"
    >
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-foreground/[0.03]"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-3 px-5 py-3.5">{header}</div>
      )}
      {expandable && open ? <div className="border-t border-border bg-muted/25 py-1">{children}</div> : null}
    </div>
  );
}

function ResultRow({ label, hint, cents, strong = false }: { label: string; hint?: string; cents: Cents; strong?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3.5", strong ? "bg-muted/60" : "bg-muted/30")}>
      <Operator symbol="=" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{label}</span>
        {hint ? <span className="block truncate text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Money
        cents={cents}
        className={cn("font-bold", strong ? "text-base" : "text-sm", cents < 0 && "text-negative")}
      />
      <span
        aria-hidden
        className="size-4 shrink-0"
      />
    </div>
  );
}

function stateText(entry: CascadeEntry, isIncome: boolean, today: DateStr) {
  const when = dayMonth(entry.date);
  if (entry.state === "done") {
    if (isIncome) return `recebida ${when}`;
    return entry.invoiceMonth ? `cobrada ${when}` : `paga ${when}`;
  }
  if (entry.state === "late") return isIncome ? `era para ${when}` : `venceu ${when}`;
  if (entry.date === today) return isIncome ? "entra hoje" : "vence hoje";
  if (isIncome) return `prevista ${when}`;
  return entry.invoiceMonth ? `cobra ${when}` : `vence ${when}`;
}

type EntryListProps = {
  entries: CascadeEntry[];
  isIncome: boolean;
  today: DateStr;
  onConfirm: (target: OccurrenceTarget) => void;
};

function EntryList({ entries, isIncome, today, onConfirm }: EntryListProps) {
  const openEdit = useEntryStore((state) => state.openEdit);

  return (
    <ul>
      {entries.map((entry) => {
        const { transaction, occurrence } = entry;
        const meta = [
          entry.accountName,
          entry.invoiceMonth ? `fatura de ${monthName(entry.invoiceMonth)}` : null,
          entry.isEstimate ? "estimado" : null,
        ].filter(Boolean);
        const body = (
          <>
            <StateMark state={entry.state} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium">{entry.description}</span>
              <span className="block truncate text-xs text-muted-foreground">
                <span className={cn(entry.state === "late" && "font-semibold text-warning")}>
                  {stateText(entry, isIncome, today)}
                </span>
                {meta.length ? ` · ${meta.join(" · ")}` : null}
              </span>
            </span>
          </>
        );
        return (
          <li key={entry.key}>
            {transaction ? (
              <button
                type="button"
                onClick={() => openEdit(transaction)}
                className="flex w-full items-center gap-3 py-2 pr-12 pl-5 text-left transition-colors hover:bg-foreground/[0.03] sm:pl-14"
              >
                {body}
                <Money
                  cents={entry.amountCents}
                  className="shrink-0 text-[0.8125rem] font-semibold"
                />
              </button>
            ) : (
              <div className="flex items-center gap-3 py-2 pr-12 pl-5 sm:pl-14">
                {body}
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Money
                    cents={entry.amountCents}
                    className="text-[0.8125rem] font-semibold text-muted-foreground"
                  />
                  {occurrence ? (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => onConfirm(occurrence)}
                    >
                      {entry.date <= today ? "Confirmar" : "Confirmar ou pular"}
                    </Button>
                  ) : null}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function StateMark({ state }: { state: CascadeEntry["state"] }) {
  if (state === "done") {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-positive/12 text-positive">
        <Check className="size-3" />
      </span>
    );
  }
  if (state === "late") {
    return (
      <span className="grid size-5 shrink-0 place-items-center">
        <span className="size-2 rounded-full bg-warning" />
      </span>
    );
  }
  return <CircleDashed className="size-5 shrink-0 p-0.5 text-muted-foreground" />;
}

function InstallmentList({ entries }: { entries: InstallmentEntry[] }) {
  const openEdit = useEntryStore((state) => state.openEdit);

  return (
    <ul>
      {entries.map(({ transaction, accountName }) => {
        const installment = transaction.installment;
        const isLast = installment ? installment.index === installment.count : false;
        return (
          <li key={transaction.id}>
            <button
              type="button"
              onClick={() => openEdit(transaction)}
              className="flex w-full items-center gap-3 py-2 pr-12 pl-5 text-left transition-colors hover:bg-foreground/[0.03] sm:pl-14"
            >
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[0.8125rem] font-medium">{transaction.description}</span>
                  {installment ? (
                    <Pill
                      tone="primary"
                      className="num"
                    >
                      {installment.index}/{installment.count}
                    </Pill>
                  ) : null}
                  {isLast ? <Pill tone="positive">última</Pill> : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {accountName} · comprado em {dayMonth(transaction.date)}
                </span>
              </span>
              <Money
                cents={transaction.amountCents}
                className="shrink-0 text-[0.8125rem] font-semibold"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SavingsList({ entries, pendingCents }: { entries: SavingsEntry[]; pendingCents: Cents }) {
  return (
    <ul>
      {entries.map((entry) => (
        <li
          key={entry.accountId}
          className="py-2 pr-12 pl-5 sm:pl-14"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate text-[0.8125rem] font-medium">{entry.name}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              <Money
                cents={entry.depositedCents}
                className="text-[0.8125rem] font-semibold text-foreground"
              />
              {entry.plannedCents ? (
                <>
                  {" "}
                  de <Money cents={entry.plannedCents} />
                </>
              ) : (
                " guardados"
              )}
            </span>
          </div>
          {entry.plannedCents ? (
            <Meter
              value={(entry.depositedCents / entry.plannedCents) * 100}
              color={entry.color}
              className="mt-1.5"
            />
          ) : null}
          {entry.withdrawnCents ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Resgatou <Money cents={entry.withdrawnCents} /> este mês
            </p>
          ) : null}
        </li>
      ))}
      {pendingCents > 0 ? (
        <li className="py-2 pr-12 pl-5 text-xs text-muted-foreground sm:pl-14">
          Falta guardar <Money cents={pendingCents} className="font-semibold text-foreground" /> para as metas do mês. O
          valor já está separado na conta acima.
        </li>
      ) : null}
    </ul>
  );
}
