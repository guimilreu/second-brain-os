import { addMonths, dayInMonth, monthOf } from "./dates";
import { invoiceMonthFor } from "./card";
import type { Account, Cents, DateStr, MonthKey, Recurring, Transaction } from "./types";

export function occurrenceDate(recurring: Recurring, month: MonthKey): DateStr | null {
  if (!recurring.active) return null;
  if (month < recurring.startMonth) return null;
  if (recurring.endMonth && month > recurring.endMonth) return null;
  if (recurring.frequency === "yearly" && Number(month.slice(5)) !== recurring.monthOfYear) return null;
  if (recurring.skippedMonths.includes(month)) return null;
  return dayInMonth(month, recurring.dayOfMonth);
}

export type Occurrence = {
  recurring: Recurring;
  /** Mês da ocorrência (chave usada para saber se já foi lançada). */
  month: MonthKey;
  date: DateStr;
  /** No cartão, o mês da fatura em que a cobrança cai. */
  invoiceMonth: MonthKey | null;
  competence: MonthKey;
  amountCents: Cents;
  posted: Transaction | null;
};

export function postedIndex(transactions: Transaction[]) {
  const index = new Map<string, Transaction>();
  for (const tx of transactions) {
    if (tx.recurringId && tx.recurringMonth) index.set(`${tx.recurringId}:${tx.recurringMonth}`, tx);
  }
  return index;
}

function buildOccurrence(
  recurring: Recurring,
  month: MonthKey,
  accountsById: Map<string, Account>,
  posted: Map<string, Transaction>,
): Occurrence | null {
  const date = occurrenceDate(recurring, month);
  if (!date) return null;
  const account = accountsById.get(recurring.accountId);
  const invoiceMonth =
    recurring.type === "expense" && account?.card ? invoiceMonthFor(account.card, date) : null;
  return {
    recurring,
    month,
    date,
    invoiceMonth,
    competence: invoiceMonth ?? monthOf(date),
    amountCents: recurring.amountCents,
    posted: posted.get(`${recurring.id}:${month}`) ?? null,
  };
}

/** Ocorrências que contam no orçamento do mês `competence` (cartão pode cair no mês seguinte). */
export function occurrencesForCompetence(
  recurrings: Recurring[],
  accounts: Account[],
  transactions: Transaction[],
  competence: MonthKey,
): Occurrence[] {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const posted = postedIndex(transactions);
  const result: Occurrence[] = [];
  for (const recurring of recurrings) {
    for (let offset = -1; offset <= 1; offset += 1) {
      const occurrence = buildOccurrence(recurring, addMonths(competence, offset), accountsById, posted);
      if (occurrence && occurrence.competence === competence) result.push(occurrence);
    }
  }
  return result.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Ocorrências com data entre `from` e `to` (inclusive). */
export function occurrencesBetween(
  recurrings: Recurring[],
  accounts: Account[],
  transactions: Transaction[],
  from: DateStr,
  to: DateStr,
): Occurrence[] {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const posted = postedIndex(transactions);
  const result: Occurrence[] = [];
  for (const recurring of recurrings) {
    for (let month = monthOf(from); month <= monthOf(to); month = addMonths(month, 1)) {
      const occurrence = buildOccurrence(recurring, month, accountsById, posted);
      if (occurrence && occurrence.date >= from && occurrence.date <= to) result.push(occurrence);
    }
  }
  return result.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Ocorrências que já venceram e não foram lançadas (olha até 2 meses para trás). */
export function overdueOccurrences(
  recurrings: Recurring[],
  accounts: Account[],
  transactions: Transaction[],
  today: DateStr,
): Occurrence[] {
  const from = dayInMonth(addMonths(monthOf(today), -2), 1);
  return occurrencesBetween(recurrings, accounts, transactions, from, today).filter((item) => !item.posted);
}

/** Estimativa mensal de uma recorrência (anual vira 1/12). */
export function monthlyEquivalentCents(recurring: Recurring): Cents {
  return recurring.frequency === "yearly" ? Math.round(recurring.amountCents / 12) : recurring.amountCents;
}

/** Mês de início sugerido: se o dia já passou neste mês, a cobrança deste mês já aconteceu fora do sistema. */
export function suggestedStartMonth(today: DateStr, dayOfMonth: number): MonthKey {
  const month = monthOf(today);
  return Number(today.slice(8)) <= dayOfMonth ? month : addMonths(month, 1);
}
