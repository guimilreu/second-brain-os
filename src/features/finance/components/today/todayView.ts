import { cardReserveNeededCents, summarizeInvoices, type InvoiceSummary } from "@/features/finance/domain/card";
import { addDays, addMonths, diffDays, monthOf, parseDateStr, weekdayOf } from "@/features/finance/domain/dates";
import { dayMonth, invoiceLabel, monthName } from "@/features/finance/domain/labels";
import { balancesByAccount } from "@/features/finance/domain/ledger";
import type { FinanceData } from "@/features/finance/domain/plan";
import { occurrencesBetween } from "@/features/finance/domain/recurring";
import type { Account, Category, Cents, DateStr, Transaction } from "@/features/finance/domain/types";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Saudação pela hora no fuso do usuário (o servidor pode estar em UTC). */
export function greetingFor(timezone: string, now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(now),
  );
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** "quarta-feira, 30 de setembro" — montado a partir da data sem hora, sem passar por Date. */
export function longDateLabel(date: DateStr): string {
  return `${WEEKDAYS[weekdayOf(date)]}, ${parseDateStr(date).day} de ${monthName(monthOf(date))}`;
}

export type CardOverview = {
  card: Account;
  open: InvoiceSummary | null;
  /** Faturas fechadas (ou vencidas) com saldo a pagar. */
  due: InvoiceSummary[];
  reserve: Account | null;
  reserveBalanceCents: Cents;
  /** O que precisa estar guardado hoje: fechadas não pagas + aberta. */
  neededCents: Cents;
  /** De onde sai o dinheiro para guardar na reserva (cofre do dia a dia). */
  operatingAccountId: string | null;
};

export function buildCardOverviews(data: FinanceData): CardOverview[] {
  const { accounts, transactions, today } = data;
  const balances = balancesByAccount(accounts, transactions);
  const operating = accounts.find((account) => account.purpose === "operating" && !account.archived) ?? null;

  return accounts
    .filter((account) => account.card && !account.archived)
    .map((card) => {
      const invoices = summarizeInvoices(card, transactions, today);
      const reserveId = card.card?.reserveAccountId ?? null;
      return {
        card,
        open: invoices.find((invoice) => invoice.state === "open") ?? null,
        due: invoices.filter(
          (invoice) => (invoice.state === "closed" || invoice.state === "overdue") && invoice.remainingCents > 0,
        ),
        reserve: accounts.find((account) => account.id === reserveId) ?? null,
        reserveBalanceCents: reserveId ? (balances.get(reserveId) ?? 0) : 0,
        neededCents: cardReserveNeededCents(invoices),
        operatingAccountId: operating?.id ?? null,
      };
    });
}

export type UpcomingItem = {
  key: string;
  kind: "recurring" | "invoice-due" | "invoice-closing" | "scheduled";
  date: DateStr;
  title: string;
  meta: string;
  /** Com sinal: entrada positiva, saída negativa. Fechamento de fatura e transferência vêm sem sinal. */
  amountCents: Cents;
  signed: boolean;
  href: string | null;
  /** Lançamento com data futura (abre para edição). */
  transaction: Transaction | null;
};

export type UpcomingDay = { date: DateStr; days: number; items: UpcomingItem[] };

/**
 * O que vem nos próximos dias: fixas ainda não lançadas, vencimento e fechamento de fatura
 * e lançamentos com data futura. Começa amanhã — o que é de hoje já aparece em "Atenção".
 */
export function buildUpcoming(data: FinanceData, horizonDays: number): UpcomingDay[] {
  const { accounts, transactions, recurrings, today } = data;
  const from = addDays(today, 1);
  const to = addDays(today, horizonDays);
  const currentYear = parseDateStr(today).year;
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const items: UpcomingItem[] = [];

  for (const occurrence of occurrencesBetween(recurrings, accounts, transactions, from, to)) {
    if (occurrence.posted) continue;
    const { recurring } = occurrence;
    const meta = [accountsById.get(recurring.accountId)?.name ?? "Conta removida"];
    if (occurrence.invoiceMonth) meta.push(`fatura de ${monthName(occurrence.invoiceMonth)}`);
    if (recurring.autoPost) meta.push("lança sozinha");
    if (recurring.isEstimate) meta.push("valor estimado");
    items.push({
      key: `recurring-${recurring.id}-${occurrence.month}`,
      kind: "recurring",
      date: occurrence.date,
      title: recurring.description,
      meta: meta.join(" · "),
      amountCents: recurring.type === "income" ? occurrence.amountCents : -occurrence.amountCents,
      signed: true,
      href: null,
      transaction: null,
    });
  }

  for (const card of accounts.filter((account) => account.card && !account.archived)) {
    for (const invoice of summarizeInvoices(card, transactions, today)) {
      if (invoice.remainingCents > 0 && invoice.dueDate >= from && invoice.dueDate <= to) {
        items.push({
          key: `due-${card.id}-${invoice.month}`,
          kind: "invoice-due",
          date: invoice.dueDate,
          title: `${invoiceLabel(invoice.month, currentYear)} vence`,
          meta: card.name,
          amountCents: -invoice.remainingCents,
          signed: true,
          href: `/cards/${card.id}?month=${invoice.month}`,
          transaction: null,
        });
      }
      if (invoice.state === "open" && invoice.closingDate >= from && invoice.closingDate <= to) {
        items.push({
          key: `closing-${card.id}-${invoice.month}`,
          kind: "invoice-closing",
          date: invoice.closingDate,
          title: `${invoiceLabel(invoice.month, currentYear)} fecha`,
          meta: `Compras a partir de ${dayMonth(invoice.closingDate)} vão para a de ${monthName(addMonths(invoice.month, 1))}`,
          amountCents: invoice.totalCents,
          signed: false,
          href: `/cards/${card.id}?month=${invoice.month}`,
          transaction: null,
        });
      }
    }
  }

  for (const tx of transactions) {
    if (tx.date < from || tx.date > to) continue;
    const account = accountsById.get(tx.accountId);
    const target = tx.toAccountId ? accountsById.get(tx.toAccountId) : undefined;
    const isTransfer = tx.type === "transfer";
    items.push({
      key: `tx-${tx.id}`,
      kind: "scheduled",
      date: tx.date,
      title: tx.description,
      meta: isTransfer
        ? `${account?.name ?? "?"} → ${target?.name ?? "?"}`
        : [account?.name, tx.invoiceMonth ? `fatura de ${monthName(tx.invoiceMonth)}` : null].filter(Boolean).join(" · "),
      amountCents: tx.type === "expense" ? -tx.amountCents : tx.amountCents,
      signed: !isTransfer,
      href: null,
      transaction: tx,
    });
  }

  const days = new Map<DateStr, UpcomingItem[]>();
  for (const item of items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    const list = days.get(item.date) ?? [];
    list.push(item);
    days.set(item.date, list);
  }
  return [...days.entries()].map(([date, list]) => ({ date, days: diffDays(today, date), items: list }));
}

export type TransactionView = {
  transaction: Transaction;
  category: Category | null;
  account: Account | null;
  toAccount: Account | null;
};

/** Últimos lançamentos até hoje (os com data futura ficam em "Próximos dias"). */
export function recentTransactions(data: FinanceData, count: number): TransactionView[] {
  const { accounts, categories, transactions, today } = data;
  const currentMonth = monthOf(today);
  // Compra parcelada aparece uma vez só: a parcela deste mês (ou a próxima a vencer).
  const installmentPick = new Map<string, Transaction>();
  for (const tx of transactions) {
    if (!tx.installment || tx.installment.count < 2) continue;
    const picked = installmentPick.get(tx.installment.groupId);
    const isCurrentOrNext = tx.competence >= currentMonth;
    const better =
      !picked ||
      (isCurrentOrNext && (picked.competence < currentMonth || tx.installment.index < picked.installment!.index)) ||
      (!isCurrentOrNext && picked.competence < currentMonth && tx.installment.index > picked.installment!.index);
    if (better) installmentPick.set(tx.installment.groupId, tx);
  }
  return transactions
    .filter((tx) => tx.date <= today)
    .filter((tx) => !tx.installment || tx.installment.count < 2 || installmentPick.get(tx.installment.groupId) === tx)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, count)
    .map((transaction) => ({
      transaction,
      category: categories.find((category) => category.id === transaction.categoryId) ?? null,
      account: accounts.find((account) => account.id === transaction.accountId) ?? null,
      toAccount: transaction.toAccountId
        ? (accounts.find((account) => account.id === transaction.toAccountId) ?? null)
        : null,
    }));
}
