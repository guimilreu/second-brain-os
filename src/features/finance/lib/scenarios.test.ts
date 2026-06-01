import { describe, expect, it } from "vitest";
import { simulateScenario } from "./scenarios";

describe("simulateScenario", () => {
  it("reduz freeToSpend ao adicionar despesa mensal sintética", () => {
    const base: Parameters<typeof simulateScenario>[0] = [
      {
        id: "salary",
        title: "Salário",
        amount: 3000,
        type: "income",
        category: "Salário",
        cadence: "monthly",
        dayOfMonth: 1,
        startsAt: new Date(2026, 0, 1),
        isActive: true,
      },
    ];
    const without = simulateScenario(base, { assumptions: [], horizonMonths: 2 });
    const withExp = simulateScenario(base, {
      assumptions: [
        {
          kind: "add-expense",
          payload: { title: "Extra", amount: 500, category: "Outro" },
        },
      ],
      horizonMonths: 2,
    });
    expect(withExp[0].scenarioFreeToSpend).toBeLessThan(without[0].baselineFreeToSpend);
  });

  it("reduz freeToSpend só no mês da despesa única", () => {
    const base: Parameters<typeof simulateScenario>[0] = [
      {
        id: "salary",
        title: "Salário",
        amount: 3000,
        type: "income",
        category: "Salário",
        cadence: "monthly",
        dayOfMonth: 1,
        startsAt: new Date(2026, 0, 1),
        isActive: true,
      },
    ];
    const without = simulateScenario(base, { assumptions: [], horizonMonths: 3 });
    const withOneTime = simulateScenario(base, {
      assumptions: [
        {
          kind: "add-one-time-expense",
          payload: { title: "Compra única", amount: 800, category: "Outro", monthOffset: 1 },
        },
      ],
      horizonMonths: 3,
    });
    expect(withOneTime[0].scenarioFreeToSpend).toBe(without[0].baselineFreeToSpend);
    expect(withOneTime[1].scenarioFreeToSpend).toBeLessThan(without[1].baselineFreeToSpend);
    expect(withOneTime[2].scenarioFreeToSpend).toBe(without[2].baselineFreeToSpend);
  });

  it("add-wishlist-month reduz livre só no mês alvo", () => {
    const base: Parameters<typeof simulateScenario>[0] = [
      {
        id: "salary",
        title: "Salário",
        amount: 3000,
        type: "income",
        category: "Salário",
        cadence: "monthly",
        dayOfMonth: 1,
        startsAt: new Date(2026, 0, 1),
        isActive: true,
      },
    ];
    const without = simulateScenario(base, { assumptions: [], horizonMonths: 2 });
    const withWishlist = simulateScenario(base, {
      assumptions: [
        {
          kind: "add-wishlist-month",
          payload: { amount: 1200, monthOffset: 0, category: "Compras" },
        },
      ],
      horizonMonths: 2,
    });
    expect(withWishlist[0].scenarioFreeToSpend).toBeLessThan(
      without[0].baselineFreeToSpend,
    );
    expect(withWishlist[1].scenarioFreeToSpend).toBe(without[1].baselineFreeToSpend);
  });

  it("delay-purchase melhora mês original e piora mês destino", () => {
    const base: Parameters<typeof simulateScenario>[0] = [
      {
        id: "salary",
        title: "Salário",
        amount: 3000,
        type: "income",
        category: "Salário",
        cadence: "monthly",
        dayOfMonth: 1,
        startsAt: new Date(2026, 0, 1),
        isActive: true,
      },
    ];
    const without = simulateScenario(base, { assumptions: [], horizonMonths: 2 });
    const delayed = simulateScenario(base, {
      assumptions: [
        {
          kind: "delay-purchase",
          payload: {
            amount: 800,
            fromMonthOffset: 0,
            toMonthOffset: 1,
            category: "Compras",
          },
        },
      ],
      horizonMonths: 2,
    });
    expect(delayed[0].scenarioFreeToSpend).toBeGreaterThan(
      without[0].baselineFreeToSpend,
    );
    expect(delayed[1].scenarioFreeToSpend).toBeLessThan(
      without[1].baselineFreeToSpend,
    );
  });
});
