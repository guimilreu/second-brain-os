import { addMonths, daysLeftInMonth, monthOf } from "./dates";
import { balancesByAccount, isSavingsAccount } from "./ledger";
import { occurrencesForCompetence, type Occurrence } from "./recurring";
import type { Account, Category, Cents, DateStr, MonthKey, Recurring, Transaction } from "./types";

export type FinanceData = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurrings: Recurring[];
  today: DateStr;
};

export type CategoryLine = {
  categoryId: string | null;
  /** Já lançado no mês (fixas + parcelas + dia a dia), descontando estornos. */
  spentCents: Cents;
  /** Fixas previstas que ainda não foram lançadas. */
  expectedCents: Cents;
  fixedCents: Cents;
  installmentsCents: Cents;
  variableCents: Cents;
  limitCents: Cents | null;
};

export type MonthPlan = {
  month: MonthKey;
  isCurrent: boolean;
  isPast: boolean;
  income: { receivedCents: Cents; expectedCents: Cents; totalCents: Cents };
  fixed: { paidCents: Cents; expectedCents: Cents; totalCents: Cents };
  installmentsCents: Cents;
  savings: { plannedCents: Cents; depositedCents: Cents; withdrawnCents: Cents; totalCents: Cents };
  /** Gastos do dia a dia já feitos (nem fixos nem parcelados), líquidos de estornos. */
  variableCents: Cents;
  /** Para o dia a dia: entradas − fixas − parcelas − guardar. */
  availableCents: Cents;
  /** Ainda pode gastar: para o dia a dia − o que já foi gasto. */
  freeCents: Cents;
  daysLeft: number | null;
  perDayCents: Cents | null;
  categories: CategoryLine[];
  pendingOccurrences: Occurrence[];
};

/** Quanto cada meta pede por mês neste mês (zero depois do prazo ou se já atingiu). */
export function plannedSavingsCents(accounts: Account[], balances: Map<string, Cents>, month: MonthKey): Cents {
  return accounts
    .filter((account) => !account.archived && account.purpose === "goal" && account.goal?.monthlyCents)
    .filter((account) => (balances.get(account.id) ?? 0) < (account.goal?.targetCents ?? 0))
    .filter((account) => !account.goal?.targetDate || month <= monthOf(account.goal.targetDate))
    .reduce((total, account) => total + (account.goal?.monthlyCents ?? 0), 0);
}

export function computeMonthPlan(data: FinanceData, month: MonthKey): MonthPlan {
  const { accounts, categories, transactions, recurrings, today } = data;
  const currentMonth = monthOf(today);
  const isCurrent = month === currentMonth;
  const isPast = month < currentMonth;
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const balances = balancesByAccount(accounts, transactions);

  const lines = new Map<string, CategoryLine>();
  const line = (categoryId: string | null) => {
    const key = categoryId ?? "none";
    let entry = lines.get(key);
    if (!entry) {
      const category = categories.find((item) => item.id === categoryId);
      entry = {
        categoryId,
        spentCents: 0,
        expectedCents: 0,
        fixedCents: 0,
        installmentsCents: 0,
        variableCents: 0,
        limitCents: category?.limitCents ?? null,
      };
      lines.set(key, entry);
    }
    return entry;
  };

  let receivedCents = 0;
  let fixedPaidCents = 0;
  let installmentsCents = 0;
  let variableCents = 0;
  let depositedCents = 0;
  let withdrawnCents = 0;

  for (const tx of transactions) {
    if (tx.competence !== month) continue;
    const account = accountsById.get(tx.accountId);
    if (tx.type === "income") {
      // Entrada que cai direto num cofre de meta/reserva é crescimento da reserva, não dinheiro do mês.
      if (!isSavingsAccount(account)) receivedCents += tx.amountCents;
    } else if (tx.type === "expense") {
      const entry = line(tx.categoryId);
      entry.spentCents += tx.amountCents;
      if (tx.recurringId) {
        fixedPaidCents += tx.amountCents;
        entry.fixedCents += tx.amountCents;
      } else if (tx.installment && tx.installment.count > 1) {
        installmentsCents += tx.amountCents;
        entry.installmentsCents += tx.amountCents;
      } else {
        variableCents += tx.amountCents;
        entry.variableCents += tx.amountCents;
      }
    } else if (tx.type === "refund") {
      const entry = line(tx.categoryId);
      entry.spentCents -= tx.amountCents;
      entry.variableCents -= tx.amountCents;
      variableCents -= tx.amountCents;
    } else if (tx.type === "transfer") {
      const fromSavings = isSavingsAccount(account);
      const toSavings = isSavingsAccount(tx.toAccountId ? accountsById.get(tx.toAccountId) : undefined);
      if (toSavings && !fromSavings) depositedCents += tx.amountCents;
      if (fromSavings && !toSavings) withdrawnCents += tx.amountCents;
    }
  }

  const occurrences = occurrencesForCompetence(recurrings, accounts, transactions, month);
  const pendingOccurrences = isPast ? [] : occurrences.filter((item) => !item.posted);
  let expectedIncomeCents = 0;
  let expectedFixedCents = 0;
  for (const occurrence of pendingOccurrences) {
    if (occurrence.recurring.type === "income") {
      if (!isSavingsAccount(accountsById.get(occurrence.recurring.accountId))) {
        expectedIncomeCents += occurrence.amountCents;
      }
    } else {
      expectedFixedCents += occurrence.amountCents;
      line(occurrence.recurring.categoryId).expectedCents += occurrence.amountCents;
    }
  }

  const plannedCents = isPast ? 0 : plannedSavingsCents(accounts, balances, month);
  const pendingPlannedCents = Math.max(plannedCents - depositedCents, 0);
  const savingsTotalCents = depositedCents - withdrawnCents + pendingPlannedCents;

  const incomeTotal = receivedCents + expectedIncomeCents;
  const fixedTotal = fixedPaidCents + expectedFixedCents;
  const availableCents = incomeTotal - fixedTotal - installmentsCents - savingsTotalCents;
  const freeCents = availableCents - variableCents;
  const daysLeft = isCurrent ? daysLeftInMonth(today) : null;

  for (const category of categories) {
    if (category.kind === "expense" && category.limitCents) line(category.id);
  }

  return {
    month,
    isCurrent,
    isPast,
    income: { receivedCents, expectedCents: expectedIncomeCents, totalCents: incomeTotal },
    fixed: { paidCents: fixedPaidCents, expectedCents: expectedFixedCents, totalCents: fixedTotal },
    installmentsCents,
    savings: {
      plannedCents,
      depositedCents,
      withdrawnCents,
      totalCents: savingsTotalCents,
    },
    variableCents,
    availableCents,
    freeCents,
    daysLeft,
    perDayCents: daysLeft ? Math.max(Math.floor(freeCents / daysLeft), 0) : null,
    categories: [...lines.values()].sort(
      (a, b) => b.spentCents + b.expectedCents - (a.spentCents + a.expectedCents),
    ),
    pendingOccurrences,
  };
}

/** Plano do mês atual e dos próximos `count - 1`. */
export function computeMonthPlans(data: FinanceData, from: MonthKey, count: number): MonthPlan[] {
  return Array.from({ length: count }, (_, index) => computeMonthPlan(data, addMonths(from, index)));
}

/**
 * Média de gasto por categoria nos meses anteriores a `month` (até `months` meses).
 * Divide só pelos meses que têm lançamentos, para não subestimar no começo do uso.
 */
export function categoryAverages(
  data: FinanceData,
  month: MonthKey,
  months = 3,
  options: { variableOnly?: boolean } = {},
): Map<string, Cents> {
  const from = addMonths(month, -months);
  const totals = new Map<string, Cents>();
  const monthsWithData = new Set<MonthKey>();
  for (const tx of data.transactions) {
    if (tx.competence >= month || tx.competence < from) continue;
    monthsWithData.add(tx.competence);
    if (tx.type !== "expense" && tx.type !== "refund") continue;
    // Só o dia a dia: fixas e parcelas não dizem nada sobre "gastei mais que o normal".
    if (options.variableOnly && (tx.recurringId || (tx.installment && tx.installment.count > 1))) continue;
    const key = tx.categoryId ?? "none";
    const signed = tx.type === "expense" ? tx.amountCents : -tx.amountCents;
    totals.set(key, (totals.get(key) ?? 0) + signed);
  }
  const divisor = Math.max(monthsWithData.size, 1);
  return new Map([...totals.entries()].map(([key, total]) => [key, Math.round(total / divisor)]));
}
