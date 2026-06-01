import { describe, expect, it } from "vitest";
import {
  affordabilityScore,
  buildOverCapMap,
  computeAvailableAfterList,
  isActivePlannedForMonth,
  isWishlistAffordable,
  sumByCategoryForMonth,
  sumEstimatedForMonth,
  wishlistAffordabilityGap,
  suggestBestMonth,
  type WishlistItemPlain,
} from "./aggregation";

const items: WishlistItemPlain[] = [
  {
    lane: "planned",
    plannedMonthKey: "2026-05",
    status: "ready",
    category: "Tecnologia",
    estimatedPrice: 400,
  },
  {
    lane: "planned",
    plannedMonthKey: "2026-05",
    status: "idea",
    category: "Lazer",
    estimatedPrice: 150,
  },
  {
    lane: "planned",
    plannedMonthKey: "2026-05",
    status: "purchased",
    category: "Tecnologia",
    estimatedPrice: 999,
    actualPrice: 320,
  },
  {
    lane: "dream",
    plannedMonthKey: null,
    status: "idea",
    category: "Sonho",
    estimatedPrice: 5000,
  },
];

describe("wishlist aggregation", () => {
  it("identifica itens ativos planejados para o mês", () => {
    expect(isActivePlannedForMonth(items[0], "2026-05")).toBe(true);
    expect(isActivePlannedForMonth(items[2], "2026-05")).toBe(false);
    expect(isActivePlannedForMonth(items[3], "2026-05")).toBe(false);
  });

  it("soma estimativas só dos ativos do mês", () => {
    expect(sumEstimatedForMonth(items, "2026-05")).toBe(550);
  });

  it("agrupa por categoria no mês", () => {
    expect(sumByCategoryForMonth(items, "2026-05")).toEqual({
      Tecnologia: 400,
      Lazer: 150,
    });
  });

  it("detecta estouro de cap", () => {
    const caps = [{ monthKey: "2026-05", capAmount: 500 }];
    const map = buildOverCapMap(["2026-05"], items, caps);
    expect(map["2026-05"]).toBe(true);

    const okCaps = [{ monthKey: "2026-05", capAmount: 600 }];
    const mapOk = buildOverCapMap(["2026-05"], items, okCaps);
    expect(mapOk["2026-05"]).toBe(false);
  });

  it("avalia se a lista cabe no livre para gastar", () => {
    const planned = sumEstimatedForMonth(items, "2026-05");
    expect(planned).toBe(550);
    expect(isWishlistAffordable(planned, 600)).toBe(true);
    expect(isWishlistAffordable(planned, 500)).toBe(false);
    expect(wishlistAffordabilityGap(planned, 500)).toBe(50);
    expect(wishlistAffordabilityGap(planned, 600)).toBe(0);
  });

  it("calcula livre após lista", () => {
    expect(computeAvailableAfterList(1000, 550)).toBe(450);
    expect(computeAvailableAfterList(400, 550)).toBe(-150);
  });

  it("classifica cabimento do item", () => {
    expect(affordabilityScore(100, 1000, 550)).toBe("comfortable");
    expect(affordabilityScore(400, 1000, 550)).toBe("tight");
    expect(affordabilityScore(600, 1000, 550)).toBe("over");
  });

  it("sugere melhor mês para item nos sonhos", () => {
    expect(
      suggestBestMonth(400, {
        futureProjection: [
          { monthKey: "2026-05", month: "mai/26", freeToSpend: 300 },
          { monthKey: "2026-06", month: "jun/26", freeToSpend: 800 },
        ],
        totalsByMonth: { "2026-05": 550, "2026-06": 100 },
      }),
    ).toBe("jun/26");
  });
});
