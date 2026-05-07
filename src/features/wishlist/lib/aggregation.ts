export type WishlistItemPlain = {
  plannedMonthKey?: string | null;
  lane: string;
  status: string;
  category: string;
  estimatedPrice: number;
  actualPrice?: number;
};

export type MonthCap = {
  monthKey: string;
  capAmount: number;
};

/** Itens que entram no total planejado de um mês */
export function isActivePlannedForMonth(item: WishlistItemPlain, monthKey: string) {
  return (
    item.lane === "planned" &&
    item.plannedMonthKey === monthKey &&
    item.status !== "purchased" &&
    item.status !== "cancelled"
  );
}

export function sumEstimatedForMonth(items: WishlistItemPlain[], monthKey: string) {
  return items
    .filter((item) => isActivePlannedForMonth(item, monthKey))
    .reduce((total, item) => total + Number(item.estimatedPrice ?? 0), 0);
}

export function sumByCategoryForMonth(items: WishlistItemPlain[], monthKey: string) {
  return items
    .filter((item) => isActivePlannedForMonth(item, monthKey))
    .reduce<Record<string, number>>((acc, item) => {
      const cat = item.category;
      acc[cat] = (acc[cat] ?? 0) + Number(item.estimatedPrice ?? 0);
      return acc;
    }, {});
}

export function isOverCapForMonth(
  estimatedTotal: number,
  monthKey: string,
  caps: MonthCap[],
) {
  const cap = caps.find((c) => c.monthKey === monthKey);
  if (!cap || cap.capAmount <= 0) return false;
  return estimatedTotal > cap.capAmount;
}

export function buildOverCapMap(
  monthKeys: string[],
  items: WishlistItemPlain[],
  caps: MonthCap[],
) {
  const map: Record<string, boolean> = {};
  for (const key of monthKeys) {
    const total = sumEstimatedForMonth(items, key);
    map[key] = isOverCapForMonth(total, key, caps);
  }
  return map;
}
