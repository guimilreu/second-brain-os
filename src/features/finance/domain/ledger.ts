import { monthOf } from "./dates";
import type { Account, Cents, MonthKey, Transaction, TxType } from "./types";

/** Mês em que o lançamento conta no orçamento. Cartão conta no mês da fatura; o resto, na data. */
export function competenceOf(tx: { type: TxType; date: string; invoiceMonth: MonthKey | null }): MonthKey {
  if ((tx.type === "expense" || tx.type === "refund") && tx.invoiceMonth) return tx.invoiceMonth;
  return monthOf(tx.date);
}

function affectsBalance(account: Account, tx: Transaction) {
  // Cartão não tem saldo inicial: toda compra/pagamento conta. Contas: só o que veio depois do saldo inicial.
  return account.kind === "credit_card" || tx.date >= account.openingDate;
}

/** Saldo derivado. Cartão fica negativo (= dívida). */
export function balancesByAccount(accounts: Account[], transactions: Transaction[]): Map<string, Cents> {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const balances = new Map(accounts.map((account) => [account.id, account.openingBalanceCents]));

  const apply = (accountId: string | null, delta: Cents, tx: Transaction) => {
    if (!accountId) return;
    const account = accountsById.get(accountId);
    if (!account || !affectsBalance(account, tx)) return;
    balances.set(accountId, (balances.get(accountId) ?? 0) + delta);
  };

  for (const tx of transactions) {
    switch (tx.type) {
      case "expense":
        apply(tx.accountId, -tx.amountCents, tx);
        break;
      case "income":
      case "refund":
        apply(tx.accountId, tx.amountCents, tx);
        break;
      case "transfer":
        apply(tx.accountId, -tx.amountCents, tx);
        apply(tx.toAccountId, tx.amountCents, tx);
        break;
    }
  }
  return balances;
}

/** Contas que entram no "dinheiro disponível" (cartão é dívida, não dinheiro). */
export function isMoneyAccount(account: Account) {
  return account.kind !== "credit_card";
}

export function isSavingsAccount(account: Account | undefined) {
  return account?.purpose === "goal" || account?.purpose === "savings";
}
