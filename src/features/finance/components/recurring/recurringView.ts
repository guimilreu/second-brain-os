import { addMonths, diffDays, monthOf } from "@/features/finance/domain/dates";
import type { FinanceData } from "@/features/finance/domain/plan";
import {
  monthlyEquivalentCents,
  occurrenceDate,
  overdueOccurrences,
  postedIndex,
} from "@/features/finance/domain/recurring";
import type { Account, Category, Cents, DateStr, MonthKey, Recurring } from "@/features/finance/domain/types";
import type { OccurrenceTarget } from "./ConfirmOccurrenceDialog";

/** Situação da fixa no mês atual (pelo mês da ocorrência, não da fatura). */
export type RecurringStatus =
  | { kind: "posted"; date: DateStr }
  | { kind: "pending"; days: number }
  | { kind: "upcoming"; days: number }
  | { kind: "skipped"; next: DateStr | null }
  | { kind: "not-started"; startMonth: MonthKey }
  | { kind: "off-month"; next: DateStr | null }
  | { kind: "paused" }
  | { kind: "ended" };

export type RecurringItem = {
  recurring: Recurring;
  account: Account | null;
  category: Category | null;
  status: RecurringStatus;
  /** Ocorrência deste mês ainda não lançada ("Confirmar este mês"). */
  confirmable: OccurrenceTarget | null;
  /** Meses anteriores que venceram sem confirmação. */
  overdue: OccurrenceTarget[];
};

function nextDate(recurring: Recurring, after: MonthKey): DateStr | null {
  for (let offset = 1; offset <= 24; offset += 1) {
    const date = occurrenceDate(recurring, addMonths(after, offset));
    if (date) return date;
  }
  return null;
}

function statusOf(recurring: Recurring, posted: DateStr | null, today: DateStr): RecurringStatus {
  const month = monthOf(today);
  if (!recurring.active) return { kind: "paused" };
  if (recurring.endMonth && recurring.endMonth < month) return { kind: "ended" };
  if (recurring.startMonth > month) return { kind: "not-started", startMonth: recurring.startMonth };
  if (posted) return { kind: "posted", date: posted };
  if (recurring.skippedMonths.includes(month)) return { kind: "skipped", next: nextDate(recurring, month) };
  const date = occurrenceDate(recurring, month);
  if (!date) return { kind: "off-month", next: nextDate(recurring, month) };
  const days = diffDays(today, date);
  return days <= 0 ? { kind: "pending", days } : { kind: "upcoming", days };
}

export function buildRecurringItems(data: FinanceData): RecurringItem[] {
  const { accounts, categories, recurrings, transactions, today } = data;
  const month = monthOf(today);
  const posted = postedIndex(transactions);
  const overdue = overdueOccurrences(recurrings, accounts, transactions, today);

  return recurrings.map((recurring) => {
    const postedTx = posted.get(`${recurring.id}:${month}`) ?? null;
    const date = postedTx ? null : occurrenceDate(recurring, month);
    return {
      recurring,
      account: accounts.find((account) => account.id === recurring.accountId) ?? null,
      category: categories.find((category) => category.id === recurring.categoryId) ?? null,
      status: statusOf(recurring, postedTx?.date ?? null, today),
      confirmable: date ? { recurring, month, date, amountCents: recurring.amountCents } : null,
      overdue: overdue
        .filter((item) => item.recurring.id === recurring.id && item.month < month)
        .map((item) => ({ recurring, month: item.month, date: item.date, amountCents: item.amountCents })),
    };
  });
}

/** Quanto entra e sai por mês nas fixas em vigor (anuais divididas por 12). */
export function recurringTotals(recurrings: Recurring[], month: MonthKey): { incomeCents: Cents; expenseCents: Cents } {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const recurring of recurrings) {
    if (!recurring.active || (recurring.endMonth && recurring.endMonth < month)) continue;
    if (recurring.type === "income") incomeCents += monthlyEquivalentCents(recurring);
    else expenseCents += monthlyEquivalentCents(recurring);
  }
  return { incomeCents, expenseCents };
}
