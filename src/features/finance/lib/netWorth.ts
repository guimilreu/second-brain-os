import { connectToDatabase } from "@/lib/db/mongodb";
import { format, startOfDay } from "date-fns";
import { BankAccount } from "@/models/BankAccount";
import { NetWorthSnapshot } from "@/models/NetWorthSnapshot";

export async function ensureTodayNetWorthSnapshot(userId: string) {
  await connectToDatabase();
  const dateKey = format(new Date(), "yyyy-MM-dd");
  const existing = await NetWorthSnapshot.findOne({ userId, dateKey });
  if (existing) return existing;

  const accounts = await BankAccount.find({ userId, isArchived: false }).lean();
  let assets = 0;
  let liabilities = 0;
  const breakdownByAccount: Record<string, number> = {};

  for (const a of accounts) {
    if (a.includeInNetWorth === false) continue;
    const bal = Number(a.balance ?? 0);
    breakdownByAccount[String(a._id)] = bal;
    if (a.type === "credit" || a.type === "loan") {
      liabilities += Math.max(0, bal);
    } else {
      assets += bal;
    }
  }

  const netWorth = assets - liabilities;
  return NetWorthSnapshot.create({
    userId,
    dateKey,
    assets,
    liabilities,
    netWorth,
    breakdownByAccount,
  });
}

export async function getNetWorthSeries(userId: string, days = 180) {
  await connectToDatabase();
  await ensureTodayNetWorthSnapshot(userId);
  const since = startOfDay(new Date());
  since.setDate(since.getDate() - days);
  const minKey = format(since, "yyyy-MM-dd");
  const rows = await NetWorthSnapshot.find({
    userId,
    dateKey: { $gte: minKey },
  })
    .sort({ dateKey: 1 })
    .lean();
  return rows.map((r) => ({
    dateKey: r.dateKey,
    netWorth: r.netWorth,
    assets: r.assets,
    liabilities: r.liabilities,
  }));
}
