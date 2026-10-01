import { addMonths } from "./dates";
import { invoiceMonthFor } from "./card";
import type { CardConfig, Cents, DateStr, MonthKey } from "./types";

/** Divide o total em `count` parcelas; os centavos que sobram vão na primeira (como os bancos fazem). */
export function splitAmount(totalCents: Cents, count: number): Cents[] {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => (index === 0 ? base + remainder : base));
}

export type PlannedInstallment = { index: number; count: number; invoiceMonth: MonthKey; amountCents: Cents };

/** Uma compra no cartão em `date`, em `count` vezes: cada parcela cai numa fatura seguida. */
export function planCardPurchase(card: CardConfig, date: DateStr, totalCents: Cents, count: number): PlannedInstallment[] {
  const first = invoiceMonthFor(card, date);
  return splitAmount(totalCents, count).map((amountCents, index) => ({
    index: index + 1,
    count,
    invoiceMonth: addMonths(first, index),
    amountCents,
  }));
}

/**
 * Parcelamento que começou antes do sistema: a parcela `currentIndex` já está na fatura aberta
 * (e no valor que o banco mostra); geramos só as que faltam, a partir da fatura seguinte.
 */
export function planOngoingInstallments(
  openInvoiceMonth: MonthKey,
  installmentCents: Cents,
  currentIndex: number,
  count: number,
): PlannedInstallment[] {
  const remaining = count - currentIndex;
  return Array.from({ length: Math.max(remaining, 0) }, (_, offset) => ({
    index: currentIndex + offset + 1,
    count,
    invoiceMonth: addMonths(openInvoiceMonth, offset + 1),
    amountCents: installmentCents,
  }));
}
