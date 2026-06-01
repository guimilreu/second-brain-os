import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

/** Quanto sobra do livre para gastar após somar itens planejados do mês. */
export function computeAvailableAfterList(freeToSpend: number, planned: number): number {
  return Math.round((freeToSpend - planned) * 100) / 100;
}

export type AffordabilityLevel = "comfortable" | "tight" | "over";

/** Score de cabimento do item no mês (com base no livre após a lista). */
export function affordabilityScore(
  itemPrice: number,
  freeToSpend: number,
  plannedTotal: number,
): AffordabilityLevel {
  const afterList = computeAvailableAfterList(freeToSpend, plannedTotal);
  if (itemPrice <= 0) return "comfortable";
  if (itemPrice <= afterList) {
    return afterList > 0 && itemPrice <= afterList * 0.5 ? "comfortable" : "tight";
  }
  return "over";
}

/** Lista planejada cabe no livre para gastar do mês. */
export function isWishlistAffordable(plannedTotal: number, freeToSpend: number) {
  return plannedTotal <= freeToSpend;
}

/** Quanto a lista excede o livre (0 se couber). */
export function wishlistAffordabilityGap(plannedTotal: number, freeToSpend: number) {
  return Math.max(0, plannedTotal - freeToSpend);
}

export type FutureProjectionMonth = {
  monthKey?: string;
  month: string;
  freeToSpend: number;
};

export type SuggestBestMonthOptions = {
  futureProjection?: FutureProjectionMonth[];
  financeHints?: Array<{ monthKey: string; freeToSpend: number }>;
  totalsByMonth?: Record<string, number>;
  monthKeys?: string[];
};

/** Melhor mês (rótulo MMM/yy) em que o item cabe no livre após a lista planejada. */
export function suggestBestMonth(
  itemPrice: number,
  options: SuggestBestMonthOptions,
): string | null {
  if (itemPrice <= 0) return null;

  const candidates: Array<{ label: string; available: number }> = [];

  if (options.futureProjection?.length) {
    for (const row of options.futureProjection) {
      const planned =
        row.monthKey && options.totalsByMonth
          ? options.totalsByMonth[row.monthKey] ?? 0
          : 0;
      candidates.push({
        label: row.month,
        available: computeAvailableAfterList(row.freeToSpend, planned),
      });
    }
  } else if (options.financeHints?.length && options.monthKeys?.length) {
    for (const key of options.monthKeys) {
      const free =
        options.financeHints.find((hint) => hint.monthKey === key)?.freeToSpend ?? 0;
      const planned = options.totalsByMonth?.[key] ?? 0;
      const [yearStr, monthStr] = key.split("-");
      const monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      candidates.push({
        label: format(monthDate, "MMM/yy", { locale: ptBR }),
        available: computeAvailableAfterList(free, planned),
      });
    }
  }

  const fit = candidates.find((row) => row.available >= itemPrice);
  return fit?.label ?? null;
}
