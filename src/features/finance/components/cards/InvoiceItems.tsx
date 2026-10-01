"use client";

import Link from "next/link";
import { CalendarCheck, CalendarX2, MoreHorizontal, ReceiptText } from "lucide-react";
import { dayMonth } from "@/features/finance/domain/labels";
import { sumCents } from "@/features/finance/domain/money";
import type { Occurrence } from "@/features/finance/domain/recurring";
import type { Account, Category, Cents, DateStr, MonthKey, Transaction } from "@/features/finance/domain/types";
import { confirmOccurrence, skipOccurrence } from "@/features/finance/server/actions";
import { CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { TransactionMenu } from "@/features/finance/components/shared/TransactionMenu";
import { TransactionRow } from "@/features/finance/components/shared/TransactionRow";
import { useAction } from "@/features/finance/components/shared/useAction";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/utils/format";
import { useEntryStore } from "@/stores/entry-store";
import type { InvoiceItems as Items } from "./cardView";

type InvoiceItemsProps = {
  cardId: string;
  month: MonthKey;
  isFuture: boolean;
  today: DateStr;
  items: Items;
  accounts: Account[];
  categories: Category[];
};

type Row = { kind: "posted"; tx: Transaction } | { kind: "predicted"; occurrence: Occurrence };

type Section = { key: string; title: string; rows: Row[]; totalCents: Cents };

const posted = (list: Transaction[]): Row[] => list.map((tx) => ({ kind: "posted", tx }));
const signedCharge = (tx: Transaction) => (tx.type === "refund" ? -tx.amountCents : tx.amountCents);

function rowDate(row: Row) {
  return row.kind === "posted" ? row.tx.date : row.occurrence.date;
}

/** O que tem na fatura, separado do jeito que se lê a fatura do banco. */
export function InvoiceItems({ cardId, month, isFuture, today, items, accounts, categories }: InvoiceItemsProps) {
  const openNew = useEntryStore((state) => state.openNew);
  const openEdit = useEntryStore((state) => state.openEdit);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));

  const fixedRows = [...posted(items.fixed), ...items.predicted.map((occurrence): Row => ({ kind: "predicted", occurrence }))]
    .sort((a, b) => (rowDate(a) < rowDate(b) ? 1 : rowDate(a) > rowDate(b) ? -1 : 0));

  const sections: Section[] = [
    {
      key: "purchases",
      title: "Compras",
      rows: posted(items.purchases),
      totalCents: sumCents(items.purchases.map(signedCharge)),
    },
    {
      key: "installments",
      title: "Parcelas",
      rows: posted(items.installments),
      totalCents: sumCents(items.installments.map(signedCharge)),
    },
    {
      key: "fixed",
      title: "Assinaturas e fixas",
      rows: fixedRows,
      totalCents:
        sumCents(items.fixed.map(signedCharge)) + sumCents(items.predicted.map((occurrence) => occurrence.amountCents)),
    },
    {
      key: "adjustments",
      title: "Estornos e ajustes",
      rows: posted(items.adjustments),
      totalCents: sumCents(items.adjustments.map(signedCharge)),
    },
    {
      key: "payments",
      title: "Pagamentos",
      rows: posted(items.payments),
      totalCents: sumCents(items.payments.map((tx) => tx.amountCents)),
    },
  ].filter((section) => section.rows.length > 0);

  const postedCount =
    items.purchases.length + items.installments.length + items.fixed.length + items.adjustments.length;
  const description = [
    postedCount ? `${postedCount} ${postedCount === 1 ? "lançamento" : "lançamentos"}` : null,
    items.predicted.length
      ? `${items.predicted.length} ${items.predicted.length === 1 ? "fixa prevista" : "fixas previstas"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Panel
      title="Itens da fatura"
      description={description || undefined}
      actions={
        postedCount ? (
          <Link
            href={`/transactions?month=${month}&account=${cardId}`}
            className="text-[0.8125rem] font-semibold text-primary hover:underline"
          >
            Ver em Lançamentos
          </Link>
        ) : null
      }
      padded={false}
    >
      {sections.length ? (
        sections.map((section, index) => (
          <div key={section.key}>
            <div
              className={cn(
                "flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2",
                index > 0 && "border-t",
              )}
            >
              <p className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                {section.title} · <span className="num">{section.rows.length}</span>
              </p>
              <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
                {section.totalCents < 0 ? "−" : null}
                <Money cents={Math.abs(section.totalCents)} />
              </span>
            </div>
            <ul className="divide-y divide-border">
              {section.rows.map((row) =>
                row.kind === "posted" ? (
                  <li key={row.tx.id}>
                    <TransactionRow
                      transaction={row.tx}
                      category={row.tx.categoryId ? categoriesById.get(row.tx.categoryId) : null}
                      account={row.tx.type === "transfer" ? accountsById.get(row.tx.accountId) : null}
                      toAccount={row.tx.toAccountId ? accountsById.get(row.tx.toAccountId) : null}
                      showDate
                      onClick={() => openEdit(row.tx)}
                      actions={<TransactionMenu transaction={row.tx} />}
                    />
                  </li>
                ) : (
                  <PredictedRow
                    key={`${row.occurrence.recurring.id}:${row.occurrence.month}`}
                    occurrence={row.occurrence}
                    category={
                      row.occurrence.recurring.categoryId
                        ? categoriesById.get(row.occurrence.recurring.categoryId)
                        : undefined
                    }
                    today={today}
                  />
                ),
              )}
            </ul>
          </div>
        ))
      ) : (
        <div className="p-4">
          <EmptyState
            icon={ReceiptText}
            title={isFuture ? "Nada previsto nesta fatura" : "Nenhuma compra nesta fatura"}
            description={
              isFuture
                ? "Parcelas e fixas do cartão que caírem aqui aparecem sozinhas."
                : "Tudo que for lançado no cartão neste período aparece aqui, separado em compras, parcelas e fixas."
            }
            actionLabel="Lançar compra"
            onAction={() => openNew({ type: "expense", accountId: cardId })}
          />
        </div>
      )}
    </Panel>
  );
}

type PredictedRowProps = {
  occurrence: Occurrence;
  category: Category | undefined;
  today: DateStr;
};

/** Fixa do cartão que ainda vai cair nesta fatura (não lançada). */
function PredictedRow({ occurrence, category, today }: PredictedRowProps) {
  const { pending, execute } = useAction();
  const { recurring } = occurrence;
  const meta = [dayMonth(occurrence.date), category?.name, recurring.isEstimate ? "valor estimado" : null].filter(Boolean);

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CategoryIcon
          icon={category?.icon}
          color={category?.color}
          className="opacity-60"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-muted-foreground">
              {recurring.description}
            </p>
            <Pill tone="info">
              Prevista
            </Pill>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {meta.join(" · ")}
          </p>
        </div>
        <span className="num text-sm font-semibold whitespace-nowrap text-muted-foreground">
          −{formatCents(occurrence.amountCents)}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ações da fixa prevista"
              disabled={pending}
              className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56"
        >
          {occurrence.date <= today ? (
            <DropdownMenuItem
              onClick={() =>
                void execute(() => confirmOccurrence({ recurringId: recurring.id, month: occurrence.month }), {
                  success: "Lançado na fatura.",
                })
              }
            >
              <CalendarCheck />
              Já cobrou: lançar
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() =>
              void execute(() => skipOccurrence({ recurringId: recurring.id, month: occurrence.month }), {
                success: "Não vai cair neste mês.",
              })
            }
          >
            <CalendarX2 />
            Não vai cobrar este mês
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
