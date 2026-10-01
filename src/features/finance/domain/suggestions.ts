import { normalizeDescription } from "./quickEntry";
import type { PaymentMethod, Transaction, TxType } from "./types";

export type EntrySuggestion = {
  /** Descrição como foi escrita na última vez. */
  description: string;
  key: string;
  type: TxType;
  categoryId: string | null;
  accountId: string;
  method: PaymentMethod | null;
  count: number;
};

/**
 * Aprende com o histórico: para cada descrição, a última categoria/conta usada.
 * Alimenta o autocompletar do lançamento rápido ("ifood" → Alimentação, Cartão Nubank).
 */
export function buildSuggestions(transactions: Transaction[], limit = 300): EntrySuggestion[] {
  const byKey = new Map<string, EntrySuggestion & { lastDate: string }>();
  for (const tx of transactions) {
    if (tx.type === "transfer" || tx.recurringId) continue;
    const key = normalizeDescription(tx.description);
    if (!key) continue;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, {
        description: tx.description,
        key,
        type: tx.type,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        method: tx.method,
        count: 1,
        lastDate: tx.date,
      });
      continue;
    }
    current.count += 1;
    if (tx.date >= current.lastDate) {
      Object.assign(current, {
        description: tx.description,
        type: tx.type,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        method: tx.method,
        lastDate: tx.date,
      });
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1))
    .slice(0, limit)
    .map((item) => ({
      description: item.description,
      key: item.key,
      type: item.type,
      categoryId: item.categoryId,
      accountId: item.accountId,
      method: item.method,
      count: item.count,
    }));
}

/** Contas mais usadas para gastos nos últimos lançamentos (ordem dos atalhos do formulário). */
export function rankAccountsByUse(transactions: Transaction[], sinceDate: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || tx.date < sinceDate) continue;
    counts.set(tx.accountId, (counts.get(tx.accountId) ?? 0) + 1);
  }
  return counts;
}
