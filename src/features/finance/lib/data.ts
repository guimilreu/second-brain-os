import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calculateFinanceForecast } from "@/features/finance/lib/forecast";
import { buildFinanceAlerts } from "@/features/finance/lib/alerts";
import { getNetWorthSeries } from "@/features/finance/lib/netWorth";
import { sumEstimatedForMonth } from "@/features/wishlist/lib/aggregation";
import { ensureDefaultCategories } from "@/lib/finance/seed-categories";
import { connectToDatabase } from "@/lib/db/mongodb";
import { serializeDocuments } from "@/lib/utils/serialize";
import { BankAccount } from "@/models/BankAccount";
import { FinancialGoal } from "@/models/FinancialGoal";
import { RecurringRule } from "@/models/RecurringRule";
import { SavingsPot } from "@/models/SavingsPot";
import { Transaction } from "@/models/Transaction";
import { CreditCardInvoice } from "@/models/CreditCardInvoice";
import { WishlistItem } from "@/models/WishlistItem";

export async function getFinanceOverview(userId: string) {
  await connectToDatabase();
  await ensureDefaultCategories(userId);

  const [accounts, transactions, recurringRules, savingsPots, goals] =
    await Promise.all([
      BankAccount.find({ userId, isArchived: false }).sort({ createdAt: -1 }),
      Transaction.find({ userId }).sort({ occurredAt: -1 }).limit(500),
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
    status: transaction.status as
      | "planned"
      | "scheduled"
      | "confirmed"
      | "late"
      | "cancelled",
    occurredAt: String(transaction.occurredAt),
    category: String(transaction.category ?? "Outro"),
    bankAccountId: transaction.bankAccountId
      ? String(transaction.bankAccountId)
      : undefined,
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
    cadence: rule.cadence as "weekly" | "monthly" | "biweekly" | "yearly" | "custom",
    intervalDays:
      rule.intervalDays === undefined ? undefined : Number(rule.intervalDays),
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
  const expectedExpenseByCat: Record<string, number> = {};
  for (const occurrence of forecast.occurrences) {
    if (occurrence.type !== "expense") continue;
    expectedExpenseByCat[occurrence.category] =
      (expectedExpenseByCat[occurrence.category] ?? 0) + occurrence.amount;
  }

  const realizedExpenseByCat: Record<string, number> = {};
  for (const transaction of transactionInputs) {
    if (transaction.type !== "expense" || transaction.status !== "confirmed") continue;
    const category = transaction.category ?? "Outro";
    realizedExpenseByCat[category] =
      (realizedExpenseByCat[category] ?? 0) + transaction.amount;
  }

  const categoryKeys = new Set([
    ...Object.keys(expectedExpenseByCat),
    ...Object.keys(realizedExpenseByCat),
    ...forecast.byCategory.map((row) => row.category),
  ]);

  const byCategoryComparison = [...categoryKeys]
    .map((category) => ({
      category,
      expected: expectedExpenseByCat[category] ?? 0,
      realized: realizedExpenseByCat[category] ?? 0,
    }))
    .filter((row) => row.expected > 0 || row.realized > 0)
    .sort((a, b) => b.realized + b.expected - (a.realized + a.expected));

  const allocationPlan = Object.entries(forecast.allocationsByPot)
    .map(([potId, amount]) => {
      const pot = savingsPots.find((item) => String(item._id) === potId);

      return {
        potId,
        name: pot?.name ?? "Cofrinho",
        color: pot?.color ?? "#ffc100",
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const monthKey = format(now, "yyyy-MM");

  const wishlistItemsRaw = await WishlistItem.find({ userId }).lean();
  const wishlistPlain = wishlistItemsRaw.map((item) => ({
    plannedMonthKey: item.plannedMonthKey ? String(item.plannedMonthKey) : null,
    lane: String(item.lane),
    status: String(item.status),
    category: String(item.category),
    estimatedPrice: Number(item.estimatedPrice ?? 0),
  }));
  const wishlistPlannedTotal = sumEstimatedForMonth(wishlistPlain, monthKey);

  const [financeAlerts, netWorthSeries] = await Promise.all([
    buildFinanceAlerts(userId, forecast, monthKey, {
      wishlistPlannedTotal,
      freeToSpend: forecast.freeToSpend,
    }).catch(() => []),
    getNetWorthSeries(userId, 180).catch(() => []),
  ]);

  const creditAccounts = accounts.filter((a) => a.type === "credit");
  const invoiceSummaries: {
    accountId: string;
    accountName: string;
    invoiceId: string;
    dueDate: string;
    remaining: number;
    status: string;
  }[] = [];
  if (creditAccounts.length) {
    const invs = await CreditCardInvoice.find({
      userId,
      bankAccountId: { $in: creditAccounts.map((a) => a._id) },
      status: { $in: ["open", "partial", "late"] },
    })
      .sort({ dueDate: 1 })
      .lean();
    const seenAcc = new Set<string>();
    const accById = new Map(creditAccounts.map((a) => [String(a._id), a] as const));
    for (const inv of invs) {
      const accId = String(inv.bankAccountId);
      if (seenAcc.has(accId)) continue;
      seenAcc.add(accId);
      const acc = accById.get(accId);
      if (!acc) continue;
      invoiceSummaries.push({
        accountId: accId,
        accountName: acc.name,
        invoiceId: String(inv._id),
        dueDate:
          inv.dueDate instanceof Date
            ? inv.dueDate.toISOString()
            : String(inv.dueDate),
        remaining: Number(inv.total) - Number(inv.paidAmount),
        status: String(inv.status),
      });
    }
  }
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
      byCategoryComparison,
    },
    monthlyHistory,
    futureProjection,
    projectionCheckpoints,
    totalBalance: accounts.reduce(
      (total, account) => total + Number(account.balance ?? 0),
      0,
    ),
    financeAlerts: serializeDocuments(financeAlerts),
    netWorthSeries,
    invoiceSummaries,
  };
}

/** Livre para gastar por mês (`YYYY-MM`), mesma base de forecast do dashboard. */
export async function getFreeToSpendForMonthKeys(userId: string, monthKeys: string[]) {
  await connectToDatabase();
  await ensureDefaultCategories(userId);

  const [transactions, recurringRules] = await Promise.all([
    Transaction.find({ userId }).sort({ occurredAt: -1 }).limit(500),
    RecurringRule.find({ userId, isActive: true }).sort({ type: 1, title: 1 }),
  ]);

  const plainTransactions = serializeDocuments(transactions);
  const plainRules = serializeDocuments(recurringRules);
  const transactionInputs = plainTransactions.map((transaction) => ({
    amount: Number(transaction.amount),
    type: transaction.type as "income" | "expense",
    status: transaction.status as
      | "planned"
      | "scheduled"
      | "confirmed"
      | "late"
      | "cancelled",
    occurredAt: String(transaction.occurredAt),
    category: String(transaction.category ?? "Outro"),
    bankAccountId: transaction.bankAccountId
      ? String(transaction.bankAccountId)
      : undefined,
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
    cadence: rule.cadence as "weekly" | "monthly" | "biweekly" | "yearly" | "custom",
    intervalDays:
      rule.intervalDays === undefined ? undefined : Number(rule.intervalDays),
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
