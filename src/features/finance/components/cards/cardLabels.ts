import type { InvoiceState } from "@/features/finance/domain/card";
import type { Account, CardConfig, Cents } from "@/features/finance/domain/types";

export type StatusTone = "neutral" | "primary" | "positive" | "negative" | "warning" | "info";

/** Mesmo critério do aviso "Guarde R$ X" em Hoje: centavos soltos não viram ação. */
export const RESERVE_MIN_GAP = 100;

type InvoiceLike = {
  state: InvoiceState;
  settledOutside: boolean;
  itemCount: number;
  paidCents: Cents;
  totalCents: Cents;
  remainingCents: Cents;
  forecastCents: Cents;
};

/** Fatura passada sem nenhuma compra nem pagamento: "paga" seria enganoso. */
export function isEmptyInvoice(invoice: InvoiceLike) {
  return invoice.state === "paid" && invoice.itemCount === 0 && invoice.paidCents === 0;
}

export function invoiceStatus(invoice: InvoiceLike): { label: string; tone: StatusTone } {
  switch (invoice.state) {
    case "future":
      return { label: "Futura", tone: "neutral" };
    case "open":
      return { label: "Aberta", tone: "primary" };
    case "closed":
      return { label: "Fechada", tone: "warning" };
    case "overdue":
      return { label: "Atrasada", tone: "negative" };
    case "paid":
      return isEmptyInvoice(invoice) ? { label: "Sem compras", tone: "neutral" } : { label: "Paga", tone: "positive" };
  }
}

/** O número que importa em cada estado: a previsão (futura), o que falta pagar (fechada) ou o total. */
export function headlineCents(invoice: InvoiceLike): Cents {
  if (invoice.state === "future") return invoice.forecastCents;
  if (invoice.state === "closed" || invoice.state === "overdue") return invoice.remainingCents;
  return invoice.totalCents;
}

/** "Vence dia 5 · fecha 7 dias antes" */
export function cycleRule(card: CardConfig) {
  return `Vence dia ${card.dueDay} · fecha ${card.closingDaysBeforeDue} dias antes`;
}

/** "no cofre Fatura", "no Cofre Fatura" ou "em Conta Nubank" — para "Guardar no cofre Fatura". */
export function inAccount(account: Pick<Account, "name" | "kind">) {
  if (account.kind !== "pocket") return `em ${account.name}`;
  return /^cofre\b/i.test(account.name) ? `no ${account.name}` : `no cofre ${account.name}`;
}
