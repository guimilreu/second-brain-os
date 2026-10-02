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
