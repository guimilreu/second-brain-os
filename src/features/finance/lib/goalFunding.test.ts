import { describe, expect, it } from "vitest";
import { calculateGoalFunding, monthlyNeed } from "./goalFunding";

describe("goalFunding", () => {
  it("calcula aporte mensal com prazo", () => {
    const result = calculateGoalFunding(
      {
        targetAmount: 12000,
        currentAmount: 2000,
        dueDate: new Date(2026, 11, 31),
        status: "active",
      },
      new Date(2026, 4, 15),
    );
    expect(result.remaining).toBe(10000);
    expect(result.monthsRemaining).toBe(8);
    expect(result.monthlyNeed).toBe(1250);
    expect(
      monthlyNeed({
        targetAmount: 12000,
        currentAmount: 2000,
        dueDate: new Date(2026, 11, 31),
        status: "active",
      }, new Date(2026, 4, 15)),
    ).toBe(1250);
  });

  it("retorna null sem prazo ou meta concluída", () => {
    expect(
      monthlyNeed({ targetAmount: 1000, currentAmount: 0, status: "active" }),
    ).toBeNull();
    expect(
      monthlyNeed({
        targetAmount: 1000,
        currentAmount: 1000,
        dueDate: new Date(2026, 11, 1),
        status: "completed",
      }),
    ).toBeNull();
  });
});
