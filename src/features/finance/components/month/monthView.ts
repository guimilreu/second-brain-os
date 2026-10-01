import { balancesByAccount, isSavingsAccount } from "@/features/finance/domain/ledger";
import { plannedSavingsCents, type FinanceData, type MonthPlan } from "@/features/finance/domain/plan";
import type { Category, Cents, DateStr, MonthKey, Transaction } from "@/features/finance/domain/types";
import type { OccurrenceTarget } from "@/features/finance/components/recurring/ConfirmOccurrenceDialog";

/** Item de Entradas ou Fixas: lançado (abre para editar) ou previsto (confirmar/pular). */
export type CascadeEntry = {
  key: string;
  description: string;
  date: DateStr;
  amountCents: Cents;
  accountName: string;
  state: "done" | "late" | "expected";
  invoiceMonth: MonthKey | null;
  isEstimate: boolean;
  transaction: Transaction | null;
  occurrence: OccurrenceTarget | null;
};

export type InstallmentEntry = {
  transaction: Transaction;
  accountName: string;
};

export type SavingsEntry = {
  accountId: string;
  name: string;
  color: string;
  plannedCents: Cents;
  depositedCents: Cents;
  withdrawnCents: Cents;
};

export type MonthDetails = {
  income: CascadeEntry[];
  fixed: CascadeEntry[];
  installments: InstallmentEntry[];
  savings: SavingsEntry[];
  /** Metas ativas sem valor mensal: o plano não reserva nada para elas. */
  goalsWithoutMonthly: string[];
};

/** Os itens por trás de cada linha da conta do mês — mesmas regras de `computeMonthPlan`. */
export function buildMonthDetails(data: FinanceData, plan: MonthPlan): MonthDetails {
  const { accounts, transactions, today } = data;
  const month = plan.month;
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const nameOf = (id: string) => accountsById.get(id)?.name ?? "Conta removida";

  const income: CascadeEntry[] = [];
  const fixed: CascadeEntry[] = [];
  const installments: InstallmentEntry[] = [];
  const deposited = new Map<string, Cents>();
  const withdrawn = new Map<string, Cents>();

  const done = (tx: Transaction): CascadeEntry => ({
    key: tx.id,
    description: tx.description,
    date: tx.date,
    amountCents: tx.amountCents,
    accountName: nameOf(tx.accountId),
    state: "done",
    invoiceMonth: tx.invoiceMonth,
    isEstimate: false,
    transaction: tx,
    occurrence: null,
  });

  for (const tx of transactions) {
    if (tx.competence !== month) continue;
    const account = accountsById.get(tx.accountId);
    if (tx.type === "income" && !isSavingsAccount(account)) {
      income.push(done(tx));
    } else if (tx.type === "expense" && tx.recurringId) {
      fixed.push(done(tx));
    } else if (tx.type === "expense" && tx.installment && tx.installment.count > 1) {
      installments.push({ transaction: tx, accountName: nameOf(tx.accountId) });
    } else if (tx.type === "transfer") {
      const toAccount = tx.toAccountId ? accountsById.get(tx.toAccountId) : undefined;
      const fromSavings = isSavingsAccount(account);
      const toSavings = isSavingsAccount(toAccount);
      if (toSavings && !fromSavings && toAccount) {
        deposited.set(toAccount.id, (deposited.get(toAccount.id) ?? 0) + tx.amountCents);
      }
      if (fromSavings && !toSavings && account) {
        withdrawn.set(account.id, (withdrawn.get(account.id) ?? 0) + tx.amountCents);
      }
    }
  }

  for (const occurrence of plan.pendingOccurrences) {
    const { recurring } = occurrence;
    const entry: CascadeEntry = {
      key: `${recurring.id}:${occurrence.month}`,
      description: recurring.description,
      date: occurrence.date,
      amountCents: occurrence.amountCents,
      accountName: nameOf(recurring.accountId),
      state: occurrence.date < today ? "late" : "expected",
      invoiceMonth: occurrence.invoiceMonth,
      isEstimate: recurring.isEstimate,
      transaction: null,
      occurrence: {
        recurring,
        month: occurrence.month,
        date: occurrence.date,
        amountCents: occurrence.amountCents,
      },
    };
    if (recurring.type === "expense") fixed.push(entry);
    else if (!isSavingsAccount(accountsById.get(recurring.accountId))) income.push(entry);
  }

  const balances = balancesByAccount(accounts, transactions);
  const savings = accounts
    .filter((account) => isSavingsAccount(account))
    .map((account) => ({
      accountId: account.id,
      name: account.name,
      color: account.color,
      plannedCents: plan.isPast ? 0 : plannedSavingsCents([account], balances, month),
      depositedCents: deposited.get(account.id) ?? 0,
      withdrawnCents: withdrawn.get(account.id) ?? 0,
    }))
    .filter((entry) => entry.plannedCents || entry.depositedCents || entry.withdrawnCents);

  const goalsWithoutMonthly = accounts
    .filter((account) => !account.archived && account.purpose === "goal" && !account.goal?.monthlyCents)
    .filter((account) => (balances.get(account.id) ?? 0) < (account.goal?.targetCents ?? Infinity))
    .map((account) => account.name);

  const byDate = (a: CascadeEntry, b: CascadeEntry) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  return {
    income: income.sort(byDate),
    fixed: fixed.sort(byDate),
    installments: installments.sort((a, b) => b.transaction.amountCents - a.transaction.amountCents),
    savings,
    goalsWithoutMonthly,
  };
}

export type CategoryRow = {
  key: string;
  categoryId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  spentCents: Cents;
  expectedCents: Cents;
  limitCents: Cents | null;
  /** Média dos meses anteriores (com lançamentos); null quando ainda não há base. */
  averageCents: Cents | null;
};

export function buildCategoryRows(
  plan: MonthPlan,
  categories: Category[],
  averages: Map<string, Cents>,
): CategoryRow[] {
  return plan.categories
    .filter((line) => line.spentCents !== 0 || line.expectedCents !== 0 || line.limitCents)
    .map((line) => {
      const category = categories.find((item) => item.id === line.categoryId) ?? null;
      const average = averages.get(line.categoryId ?? "none") ?? 0;
      return {
        key: line.categoryId ?? "none",
        categoryId: line.categoryId,
        name: category?.name ?? "Sem categoria",
        icon: category?.icon ?? null,
        color: category?.color ?? null,
        spentCents: line.spentCents,
        expectedCents: line.expectedCents,
        limitCents: line.limitCents,
        averageCents: average > 0 ? average : null,
      };
    });
}

export type ForecastRow = {
  month: MonthKey;
  freeCents: Cents;
  installmentsCents: Cents;
};
