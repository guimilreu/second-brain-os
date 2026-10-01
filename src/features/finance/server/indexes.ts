import { Account } from "@/models/Account";
import { Category } from "@/models/Category";
import { Recurring } from "@/models/Recurring";
import { Transaction } from "@/models/Transaction";

declare global {
  var financeIndexesSynced: Promise<void> | undefined;
}

/**
 * Alinha os índices ao schema atual (uma vez por processo). O app antigo deixou índices nas mesmas
 * coleções — ex.: `categories` único por `slug`, que impede criar as categorias novas.
 * Só mexe em índices, nunca em documentos.
 */
export function ensureFinanceIndexes() {
  global.financeIndexesSynced ??= Promise.all([
    Category.syncIndexes(),
    Transaction.syncIndexes(),
    Account.syncIndexes(),
    Recurring.syncIndexes(),
  ]).then(() => undefined);
  return global.financeIndexesSynced;
}

/** Lançamentos no formato atual (o app antigo usava a mesma coleção com outro formato). */
export const CURRENT_TRANSACTION_FILTER = { amountCents: { $exists: true } } as const;
