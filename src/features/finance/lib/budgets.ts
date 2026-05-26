import { endOfMonth, startOfMonth } from "date-fns";
import { calculateFinanceForecast } from "@/features/finance/lib/forecast";
import { connectToDatabase } from "@/lib/db/mongodb";
import { serializeDocuments } from "@/lib/utils/serialize";
import { CategoryBudget } from "@/models/CategoryBudget";
import { RecurringRule } from "@/models/RecurringRule";
import { Transaction } from "@/models/Transaction";

export type BudgetUsageRow = {
  category: string;
  planned: number;
  spent: number;
  remaining: number;
  projection: number;
};

export async function getBudgetUsage(userId: string, monthKey: string) {
  await connectToDatabase();
  const [yStr, mStr] = monthKey.split("-");
  const start = startOfMonth(new Date(Number(yStr), Number(mStr) - 1, 1));
  const end = endOfMonth(start);

  const [budgets, transactions, recurringRules] = await Promise.all([
    CategoryBudget.find({ userId, monthKey }).lean(),
    Transaction.find({
      userId,
      type: "expense",
      status: "confirmed",
      occurredAt: { $gte: start, $lte: end },
    }).lean(),
    RecurringRule.find({ userId, isActive: true }).lean(),
  ]);

  const spentByCat: Record<string, number> = {};
  for (const t of transactions) {
    const c = String(t.category ?? "Outro");
    spentByCat[c] = (spentByCat[c] ?? 0) + Number(t.amount);
  }

  const plainRules = serializeDocuments(recurringRules);
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
    [],
    recurringInputs,
    start,
    end,
    new Date(),
  );
  const projectedExpenseByCat: Record<string, number> = {};
  for (const o of forecast.occurrences) {
    if (o.type !== "expense") continue;
    projectedExpenseByCat[o.category] =
      (projectedExpenseByCat[o.category] ?? 0) + o.amount;
  }

  const keys = new Set<string>();
  for (const b of budgets) keys.add(String(b.category));
  for (const c of Object.keys(spentByCat)) keys.add(c);

  const rows: BudgetUsageRow[] = [...keys].map((category) => {
    const budget = budgets.find((b) => String(b.category) === category);
    const planned = budget ? Number(budget.plannedAmount) : 0;
    const spent = spentByCat[category] ?? 0;
    const projection = projectedExpenseByCat[category] ?? 0;
    return {
      category,
      planned,
      spent,
      remaining: planned - spent,
      projection,
    };
  });

  return rows.sort((a, b) => b.planned - a.planned);
}
