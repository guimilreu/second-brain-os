import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { getBudgetUsage } from "@/features/finance/lib/budgets";
import type { FinanceForecast } from "@/features/finance/lib/forecast";
import { connectToDatabase } from "@/lib/db/mongodb";
import { BankAccount } from "@/models/BankAccount";
import { CreditCardInvoice } from "@/models/CreditCardInvoice";
import { FinanceAlert } from "@/models/FinanceAlert";
import { SavingsPot } from "@/models/SavingsPot";
import { Transaction } from "@/models/Transaction";

export async function buildFinanceAlerts(
  userId: string,
  forecast: FinanceForecast,
  monthKey: string,
) {
  await connectToDatabase();
  const pending = await FinanceAlert.find({
    userId,
    acknowledgedAt: { $exists: false },
  })
    .sort({ triggeredAt: -1 })
    .limit(20)
    .lean();

  if (pending.length) {
    return pending;
  }

  const alerts: Array<{
    kind: "low-balance" | "invoice-due" | "budget-exceeded" | "goal-milestone" | "recurring-late" | "unusual-spending";
    payload: Record<string, unknown>;
  }> = [];

  const accounts = await BankAccount.find({ userId, isArchived: false });
  for (const acc of accounts) {
    const min = Number(acc.safeMinimum ?? 0);
    if (min > 0 && Number(acc.availableBalance ?? acc.balance) < min) {
      alerts.push({
        kind: "low-balance",
        payload: {
          accountId: String(acc._id),
          name: acc.name,
          balance: acc.availableBalance ?? acc.balance,
        },
      });
    }
    if (acc.type === "credit") {
      const inv = await CreditCardInvoice.findOne({
        userId,
        bankAccountId: acc._id,
        status: { $in: ["open", "partial", "late"] },
      }).sort({ dueDate: 1 });
      if (inv) {
        const due = new Date(inv.dueDate);
        const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
        if (days <= 5 && days >= 0 && Number(inv.total) > Number(inv.paidAmount)) {
          alerts.push({
            kind: "invoice-due",
            payload: {
              accountId: String(acc._id),
              invoiceId: String(inv._id),
              dueDate: inv.dueDate,
              remaining: Number(inv.total) - Number(inv.paidAmount),
            },
          });
        }
      }
    }
  }

  for (const occ of forecast.occurrences.filter((o) => o.status === "late")) {
    alerts.push({
      kind: "recurring-late",
      payload: { title: occ.title, date: occ.date },
    });
  }

  const usage = await getBudgetUsage(userId, monthKey);
  for (const row of usage) {
    if (row.planned > 0 && row.spent / row.planned >= 0.9) {
      alerts.push({
        kind: "budget-exceeded",
        payload: { category: row.category, spent: row.spent, planned: row.planned },
      });
    }
  }

  const pots = await SavingsPot.find({ userId });
  for (const p of pots) {
    const t = Number(p.targetAmount) || 0;
    if (t > 0 && Number(p.currentAmount) >= t * 0.95) {
      alerts.push({
        kind: "goal-milestone",
        payload: { potId: String(p._id), name: p.name },
      });
    }
  }

  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 6));
  const history = await Transaction.find({
    userId,
    type: "expense",
    status: "confirmed",
    occurredAt: { $gte: sixMonthsAgo },
  }).lean();

  const byCat: Record<string, number[]> = {};
  for (const t of history) {
    const c = String(t.category);
    if (!byCat[c]) byCat[c] = [];
    byCat[c].push(Number(t.amount));
  }
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const recent = await Transaction.find({
    userId,
    type: "expense",
    status: "confirmed",
    occurredAt: { $gte: monthStart, $lte: monthEnd },
  }).lean();
  const cats = new Set<string>();
  for (const t of recent) {
    if (cats.has(String(t.category))) continue;
    const arr = byCat[t.category];
    if (!arr || arr.length < 3) continue;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    if (mean > 0 && Number(t.amount) > mean * 2) {
      alerts.push({
        kind: "unusual-spending",
        payload: { category: t.category, amount: t.amount, avg: mean },
      });
      cats.add(String(t.category));
    }
  }

  const created = await FinanceAlert.insertMany(
    alerts.slice(0, 15).map((a) => ({ ...a, userId, triggeredAt: new Date() })),
  );
  return created;
}

export async function acknowledgeAlert(userId: string, alertId: string) {
  await connectToDatabase();
  await FinanceAlert.updateOne(
    { _id: alertId, userId },
    { $set: { acknowledgedAt: new Date() } },
  );
}
