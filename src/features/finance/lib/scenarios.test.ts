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
});
