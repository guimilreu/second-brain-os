import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calculateFinanceForecast } from "@/features/finance/lib/forecast";
import { connectToDatabase } from "@/lib/db/mongodb";
import { serializeDocuments } from "@/lib/utils/serialize";
import { BankAccount } from "@/models/BankAccount";
import { FinancialGoal } from "@/models/FinancialGoal";
import { RecurringRule } from "@/models/RecurringRule";
import { SavingsPot } from "@/models/SavingsPot";
import { Transaction } from "@/models/Transaction";

export async function getFinanceOverview(userId: string) {
  await connectToDatabase();

  const [accounts, transactions, recurringRules, savingsPots, goals] =
    await Promise.all([
      BankAccount.find({ userId, isArchived: false }).sort({ createdAt: -1 }),
      Transaction.find({ userId }).sort({ occurredAt: -1 }).limit(100),
      RecurringRule.find({ userId, isActive: true }).sort({ type: 1, title: 1 }),
      SavingsPot.find({ userId }).sort({ priority: 1 }),
      FinancialGoal.find({ userId }).sort({ status: 1, dueDate: 1 }),
    ]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const plainTransactions = serializeDocuments(transactions);
  const plainRules = serializeDocuments(recurringRules);
  const transactionInputs = plainTransactions.map((transaction) => ({
    amount: Number(transaction.amount),
    type: transaction.type as "income" | "expense",
    status: transaction.status as "planned" | "confirmed" | "late" | "cancelled",
    occurredAt: String(transaction.occurredAt),
    recurringRuleId: transaction.recurringRuleId
      ? String(transaction.recurringRuleId)
      : undefined,
    recurringOccurrenceDate: transaction.recurringOccurrenceDate
      ? String(transaction.recurringOccurrenceDate)
      : undefined,
  }));
  const recurringInputs = plainRules.map((rule) => ({
    id: String(rule.id),
    title: String(rule.title),
    amount: Number(rule.amount),
    type: rule.type as "income" | "expense",
    category: String(rule.category),
    cadence: rule.cadence as "weekly" | "monthly",
    dayOfWeek:
      rule.dayOfWeek === undefined ? undefined : Number(rule.dayOfWeek),
    dayOfMonth:
      rule.dayOfMonth === undefined ? undefined : Number(rule.dayOfMonth),
    startsAt: String(rule.startsAt),
    endsAt: rule.endsAt ? String(rule.endsAt) : undefined,
    isActive: Boolean(rule.isActive),
    allocationPercent: Number(rule.allocationPercent ?? 0),
    savingsPotId: rule.savingsPotId ? String(rule.savingsPotId) : undefined,
  }));
  const forecast = calculateFinanceForecast(
    transactionInputs,
    recurringInputs,
    monthStart,
    monthEnd,
    now,
  );
  const futureProjection = Array.from({ length: 12 }, (_, index) => {
    const monthDate = addMonths(now, index);
    const projection = calculateFinanceForecast(
      transactionInputs,
      recurringInputs,
      startOfMonth(monthDate),
      endOfMonth(monthDate),
      now,
    );

    return {
      month: format(monthDate, "MMM/yy", { locale: ptBR }),
      expectedIncome: projection.expectedIncome + projection.plannedIncome,
      expectedExpenses: projection.expectedExpenses + projection.plannedExpenses,
      allocationAmount: projection.allocationAmount,
      projectedNet: projection.projectedNet,
      freeToSpend: projection.freeToSpend,
    };
  });
  const projectionCheckpoints = {
    threeMonths: futureProjection
      .slice(0, 3)
      .reduce((total, month) => total + month.freeToSpend, 0),
    sixMonths: futureProjection
      .slice(0, 6)
      .reduce((total, month) => total + month.freeToSpend, 0),
    twelveMonths: futureProjection
      .reduce((total, month) => total + month.freeToSpend, 0),
  };

  const upcomingOccurrences = forecast.occurrences
    .filter((occurrence) => occurrence.date >= now)
    .slice(0, 6);

  const lateOccurrences = forecast.occurrences.filter(
    (occurrence) => occurrence.status === "late",
  );
  const monthlyHistory = Array.from({ length: 6 }, (_, index) => {
    const monthDate = subMonths(now, 5 - index);
    const monthStartDate = startOfMonth(monthDate);
    const monthEndDate = endOfMonth(monthDate);
    const monthTransactions = plainTransactions.filter((transaction) => {
      const occurredAt = new Date(String(transaction.occurredAt));
      return (
        occurredAt >= monthStartDate &&
        occurredAt <= monthEndDate &&
        transaction.status !== "cancelled"
      );
    });
    const income = monthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + Number(transaction.amount), 0);
    const expenses = monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + Number(transaction.amount), 0);

    return {
      month: format(monthDate, "MMM/yy", { locale: ptBR }),
      income,
      expenses,
      net: income - expenses,
    };
  });
  const allocationPlan = Object.entries(forecast.allocationsByPot)
    .map(([potId, amount]) => {
      const pot = savingsPots.find((item) => String(item._id) === potId);

      return {
        potId,
        name: pot?.name ?? "Cofrinho",
        color: pot?.color ?? "#635bff",
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    accounts: serializeDocuments(accounts),
    transactions: plainTransactions,
    recurringRules: plainRules,
    savingsPots: serializeDocuments(savingsPots),
    goals: serializeDocuments(goals),
    forecast: {
      ...forecast,
      upcomingOccurrences,
      lateOccurrences,
      allocationPlan,
    },
    monthlyHistory,
    futureProjection,
    projectionCheckpoints,
    totalBalance: accounts.reduce(
      (total, account) => total + Number(account.balance ?? 0),
      0,
    ),
  };
}

/** Livre para gastar por mês (`YYYY-MM`), mesma base de forecast do dashboard. */
export async function getFreeToSpendForMonthKeys(userId: string, monthKeys: string[]) {
  await connectToDatabase();

  const [transactions, recurringRules] = await Promise.all([
    Transaction.find({ userId }).sort({ occurredAt: -1 }).limit(100),
    RecurringRule.find({ userId, isActive: true }).sort({ type: 1, title: 1 }),
  ]);

  const plainTransactions = serializeDocuments(transactions);
  const plainRules = serializeDocuments(recurringRules);
  const transactionInputs = plainTransactions.map((transaction) => ({
    amount: Number(transaction.amount),
    type: transaction.type as "income" | "expense",
    status: transaction.status as "planned" | "confirmed" | "late" | "cancelled",
    occurredAt: String(transaction.occurredAt),
    recurringRuleId: transaction.recurringRuleId
      ? String(transaction.recurringRuleId)
      : undefined,
    recurringOccurrenceDate: transaction.recurringOccurrenceDate
      ? String(transaction.recurringOccurrenceDate)
      : undefined,
  }));
  const recurringInputs = plainRules.map((rule) => ({
    id: String(rule.id),
    title: String(rule.title),
    amount: Number(rule.amount),
    type: rule.type as "income" | "expense",
    category: String(rule.category),
    cadence: rule.cadence as "weekly" | "monthly",
    dayOfWeek:
      rule.dayOfWeek === undefined ? undefined : Number(rule.dayOfWeek),
    dayOfMonth:
      rule.dayOfMonth === undefined ? undefined : Number(rule.dayOfMonth),
    startsAt: String(rule.startsAt),
    endsAt: rule.endsAt ? String(rule.endsAt) : undefined,
    isActive: Boolean(rule.isActive),
    allocationPercent: Number(rule.allocationPercent ?? 0),
    savingsPotId: rule.savingsPotId ? String(rule.savingsPotId) : undefined,
  }));

  const now = new Date();

  return monthKeys.map((monthKey) => {
    const [yearStr, monthStr] = monthKey.split("-");
    const monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    const projection = calculateFinanceForecast(
      transactionInputs,
      recurringInputs,
      startOfMonth(monthDate),
      endOfMonth(monthDate),
      now,
    );

    return { monthKey, freeToSpend: projection.freeToSpend };
  });
}
