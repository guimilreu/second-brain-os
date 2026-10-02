import { addDays, addMonths, dayInMonth, monthOf } from "./dates";
import type { Account, CardConfig, Cents, DateStr, MonthKey, Transaction } from "./types";

/**
 * Datas de fechamento e vencimento da fatura identificada pelo mês em que fecha.
 * O vencimento é fixo; o fechamento é N dias antes dele, então cai em dias diferentes a cada mês.
 */
export function invoiceDates(card: CardConfig, month: MonthKey): { closingDate: DateStr; dueDate: DateStr } {
  const override = card.cycleOverrides.find((item) => item.month === month);
  if (override) return { closingDate: override.closingDate, dueDate: override.dueDate };
  // Vencimento depois do fechamento no mesmo mês (dia 15, fecha 7 antes = dia 8) ou só no mês seguinte.
  const dueMonth = card.dueDay > card.closingDaysBeforeDue ? month : addMonths(month, 1);
  const dueDate = dayInMonth(dueMonth, card.dueDay);
  return { closingDate: addDays(dueDate, -card.closingDaysBeforeDue), dueDate };
}

/**
 * Fatura em que cai uma compra feita em `date`.
 * Compra no dia do fechamento ou depois já vai para a fatura seguinte (regra do Nubank).
 */
export function invoiceMonthFor(card: CardConfig, date: DateStr): MonthKey {
  const base = monthOf(date);
  for (let offset = -1; offset <= 2; offset += 1) {
    const month = addMonths(base, offset);
    if (date < invoiceDates(card, month).closingDate) return month;
  }
  return addMonths(base, 2);
}

/** Fatura paga antes do app (até `settledThroughMonth`): histórico, sem dívida nem reserva. */
export function isSettledOutside(card: CardConfig, month: MonthKey | null): boolean {
  return Boolean(month && card.settledThroughMonth && month <= card.settledThroughMonth);
}

/** Faturas já fechadas, da mais recente para trás: as candidatas a "já estava paga antes do app". */
export function recentClosedInvoices(card: CardConfig, today: DateStr, count = 3) {
  const openMonth = invoiceMonthFor(card, today);
  return Array.from({ length: count }, (_, index) => {
    const month = addMonths(openMonth, -(index + 1));
    return { month, ...invoiceDates(card, month) };
  });
}

/** Palpite de até qual fatura já está paga: a mais recente que já venceu. */
export function defaultSettledMonth(card: CardConfig, today: DateStr): MonthKey | null {
  return recentClosedInvoices(card, today).find((invoice) => invoice.dueDate < today)?.month ?? null;
}

export type InvoiceState = "future" | "open" | "closed" | "overdue" | "paid";

export type InvoiceSummary = {
  cardId: string;
  month: MonthKey;
  closingDate: DateStr;
  dueDate: DateStr;
  chargesCents: Cents;
  creditsCents: Cents;
  totalCents: Cents;
  paidCents: Cents;
  remainingCents: Cents;
  state: InvoiceState;
  itemCount: number;
  /** Paga antes do app (até `settledThroughMonth`): sem dívida, sem reserva. */
  settledOutside: boolean;
};

export function invoiceState(
  card: CardConfig,
  month: MonthKey,
  today: DateStr,
  remainingCents: Cents,
): InvoiceState {
  const openMonth = invoiceMonthFor(card, today);
  if (month > openMonth) return "future";
  if (month === openMonth) return "open";
  if (remainingCents <= 0) return "paid";
  return today > invoiceDates(card, month).dueDate ? "overdue" : "closed";
}

/** Faturas do cartão (todas as que têm movimento + a aberta e a anterior), em ordem cronológica. */
export function summarizeInvoices(card: Account, transactions: Transaction[], today: DateStr): InvoiceSummary[] {
  if (!card.card) return [];
  const config = card.card;
  const byMonth = new Map<MonthKey, { charges: Cents; credits: Cents; paid: Cents; items: number }>();
  const bucket = (month: MonthKey) => {
    let entry = byMonth.get(month);
    if (!entry) {
      entry = { charges: 0, credits: 0, paid: 0, items: 0 };
      byMonth.set(month, entry);
    }
    return entry;
  };

  for (const tx of transactions) {
    if (!tx.invoiceMonth) continue;
    if (tx.accountId === card.id && tx.type === "expense") {
      const entry = bucket(tx.invoiceMonth);
      entry.charges += tx.amountCents;
      entry.items += 1;
    } else if (tx.accountId === card.id && tx.type === "refund") {
      const entry = bucket(tx.invoiceMonth);
      entry.credits += tx.amountCents;
      entry.items += 1;
    } else if (tx.type === "transfer" && tx.toAccountId === card.id) {
      bucket(tx.invoiceMonth).paid += tx.amountCents;
    }
  }

  const openMonth = invoiceMonthFor(config, today);
  bucket(openMonth);
  bucket(addMonths(openMonth, -1));

  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, entry]) => {
      const totalCents = entry.charges - entry.credits;
      const settledOutside = isSettledOutside(config, month);
      const paidCents = settledOutside ? Math.max(entry.paid, totalCents) : entry.paid;
      const remainingCents = totalCents - paidCents;
      return {
        cardId: card.id,
        month,
        ...invoiceDates(config, month),
        chargesCents: entry.charges,
        creditsCents: entry.credits,
        totalCents,
        paidCents,
        remainingCents,
        state: settledOutside ? "paid" : invoiceState(config, month, today, remainingCents),
        itemCount: entry.items,
        settledOutside,
      };
    });
}

/** Limite usado = tudo que ainda não foi pago, inclusive parcelas futuras (o banco segura o valor cheio). */
export function cardUsedLimitCents(invoices: InvoiceSummary[]): Cents {
  return invoices.reduce((total, invoice) => total + Math.max(invoice.remainingCents, 0), 0);
}

/**
 * Quanto precisa estar guardado no cofre da fatura hoje:
 * tudo que falta pagar das faturas já fechadas e da aberta (parcelas futuras ficam para os próximos meses).
 */
export function cardReserveNeededCents(invoices: InvoiceSummary[]): Cents {
  return invoices
    .filter((invoice) => invoice.state === "open" || invoice.state === "closed" || invoice.state === "overdue")
    .reduce((total, invoice) => total + Math.max(invoice.remainingCents, 0), 0);
}
