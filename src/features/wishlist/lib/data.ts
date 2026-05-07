import { addMonths, format, startOfMonth } from "date-fns";
import { getFreeToSpendForMonthKeys } from "@/features/finance/lib/data";
import { connectToDatabase } from "@/lib/db/mongodb";
import { serializeDocuments } from "@/lib/utils/serialize";
import { BankAccount } from "@/models/BankAccount";
import { WishlistItem } from "@/models/WishlistItem";
import { WishlistMonthBudget } from "@/models/WishlistMonthBudget";
import {
  buildOverCapMap,
  sumByCategoryForMonth,
  sumEstimatedForMonth,
  type WishlistItemPlain,
} from "./aggregation";
import type { WishlistOverview, WishlistOverviewItem } from "./types";

export type { WishlistOverview, WishlistOverviewItem } from "./types";

function boardMonthKeys(count: number): string[] {
  const anchor = startOfMonth(new Date());
  return Array.from({ length: count }, (_, index) =>
    format(addMonths(anchor, index), "yyyy-MM"),
  );
}

/** Meses com totais/indicadores: janela padrão + meses onde existem itens planejados (evita lacunas nos cards). */
function mergeAggregationMonths(
  windowKeys: string[],
  items: WishlistOverviewItem[],
): string[] {
  const set = new Set(windowKeys);
  for (const item of items) {
    if (item.lane === "planned" && item.plannedMonthKey) {
      set.add(String(item.plannedMonthKey));
    }
  }
  return Array.from(set).sort();
}

function toPlain(item: WishlistOverviewItem): WishlistItemPlain {
  return {
    plannedMonthKey:
      item.plannedMonthKey === undefined || item.plannedMonthKey === ""
        ? null
        : String(item.plannedMonthKey),
    lane: String(item.lane),
    status: String(item.status),
    category: String(item.category),
    estimatedPrice: Number(item.estimatedPrice ?? 0),
    actualPrice:
      item.actualPrice === undefined || item.actualPrice === null
        ? undefined
        : Number(item.actualPrice),
  };
}

export async function getWishlistOverview(userId: string): Promise<WishlistOverview> {
  await connectToDatabase();

  const horizonKeys = boardMonthKeys(6);

  const [itemsRaw, budgetsRaw, accountsRaw] = await Promise.all([
    WishlistItem.find({ userId }).sort({
      lane: 1,
      plannedMonthKey: 1,
      sortOrder: 1,
      createdAt: -1,
    }),
    WishlistMonthBudget.find({ userId }).sort({ monthKey: 1 }),
    BankAccount.find({ userId, isArchived: false }).sort({ createdAt: -1 }),
  ]);

  const items = serializeDocuments(itemsRaw) as WishlistOverviewItem[];
  const budgets = serializeDocuments(budgetsRaw);
  const totalsKeys = mergeAggregationMonths(horizonKeys, items);
  const financeHints = await getFreeToSpendForMonthKeys(userId, totalsKeys);

  const caps = budgets.map((b) => ({
    monthKey: String(b.monthKey),
    capAmount: Number(b.capAmount ?? 0),
  }));

  const plainItems = items.map(toPlain);
  const totalsByMonth = Object.fromEntries(
    totalsKeys.map((key) => [key, sumEstimatedForMonth(plainItems, key)]),
  );
  const categoryTotalsByMonth = Object.fromEntries(
    totalsKeys.map((key) => [key, sumByCategoryForMonth(plainItems, key)]),
  );
  const overCapByMonth = buildOverCapMap(totalsKeys, plainItems, caps);

  const monthBudgets = budgets.map((b) => ({
    id: String(b.id),
    monthKey: String(b.monthKey),
    capAmount: Number(b.capAmount ?? 0),
  }));

  const accounts = accountsRaw.map((account) => ({
    id: String(account._id),
    name: String(account.name),
  }));

  return {
    monthKeys: horizonKeys,
    items,
    monthBudgets,
    totalsByMonth,
    categoryTotalsByMonth,
    overCapByMonth,
    financeHints,
    accounts,
  };
}
