"use client";

import { addDays } from "@/features/finance/domain/dates";
import { weekdayDayMonth } from "@/features/finance/domain/labels";
import type { Account, Category, DateStr, Transaction } from "@/features/finance/domain/types";
import { TransactionMenu } from "@/features/finance/components/shared/TransactionMenu";
import { TransactionRow } from "@/features/finance/components/shared/TransactionRow";
import { formatCents } from "@/lib/utils/format";

type TransactionListProps = {
  transactions: Transaction[];
  accountsById: Map<string, Account>;
  categoriesById: Map<string, Category>;
  today: DateStr;
  /** Compra parcelada: lista corrida (todas as parcelas têm a mesma data). */
  flat?: boolean;
  onEdit: (transaction: Transaction) => void;
};

type Day = { date: DateStr; items: Transaction[]; netCents: number };

function groupByDay(transactions: Transaction[]): Day[] {
  const days: Day[] = [];
  for (const tx of transactions) {
    let day = days[days.length - 1];
    if (!day || day.date !== tx.date) {
      day = { date: tx.date, items: [], netCents: 0 };
      days.push(day);
    }
    day.items.push(tx);
    if (tx.type === "expense") day.netCents -= tx.amountCents;
    else if (tx.type !== "transfer") day.netCents += tx.amountCents;
  }
  return days;
}

function dayTitle(date: DateStr, today: DateStr) {
  const label = weekdayDayMonth(date);
  const year = date.slice(0, 4);
  const withYear = year === today.slice(0, 4) ? label : `${label}/${year.slice(2)}`;
  if (date === today) return `Hoje · ${withYear}`;
  if (date === addDays(today, -1)) return `Ontem · ${withYear}`;
  return withYear;
}

export function TransactionList({
  transactions,
  accountsById,
  categoriesById,
  today,
  flat = false,
  onEdit,
}: TransactionListProps) {
  function renderRow(tx: Transaction) {
    const account = accountsById.get(tx.accountId);
    return (
      <TransactionRow
        key={tx.id}
        transaction={tx}
        category={tx.categoryId ? categoriesById.get(tx.categoryId) : null}
        account={account}
        toAccount={tx.toAccountId ? accountsById.get(tx.toAccountId) : null}
        showInvoice={Boolean(account?.card)}
        onClick={() => onEdit(tx)}
        actions={<TransactionMenu transaction={tx} />}
      />
    );
  }

  if (flat) {
    return (
      <div className="tile divide-y divide-border overflow-clip">
        {transactions.map(renderRow)}
      </div>
    );
  }

  return (
    <div className="tile overflow-clip">
      {groupByDay(transactions).map((day) => (
        <section
          key={day.date}
          aria-label={dayTitle(day.date, today)}
          className="border-t border-border first:border-t-0"
        >
          <header className="sticky top-14 z-10 flex items-center justify-between gap-3 border-b border-border bg-muted/85 px-4 py-1.5 backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-muted-foreground">{dayTitle(day.date, today)}</h3>
            {day.netCents ? (
              <span className="num text-xs text-muted-foreground">
                {day.netCents > 0 ? "+" : "−"}
                {formatCents(Math.abs(day.netCents))}
              </span>
            ) : null}
          </header>
          <div className="divide-y divide-border">{day.items.map(renderRow)}</div>
        </section>
      ))}
    </div>
  );
}
