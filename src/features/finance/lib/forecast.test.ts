import { describe, expect, it } from "vitest";
import {
  calculateFinanceForecast,
  generateRecurringOccurrences,
  type ForecastRecurringRule,
} from "./forecast";

const rules: ForecastRecurringRule[] = [
  {
    id: "weekly-income",
    title: "Pagamento semanal",
    amount: 375,
    type: "income",
    category: "Trabalho",
    cadence: "weekly",
    dayOfWeek: 5,
    startsAt: "2026-05-01T00:00:00.000Z",
    isActive: true,
    allocationPercent: 20,
    savingsPotId: "viagem",
  },
  {
    id: "monthly-income",
    title: "Pagamento mensal",
    amount: 1700,
    type: "income",
    category: "Trabalho",
    cadence: "monthly",
    dayOfMonth: 10,
    startsAt: "2026-05-01T00:00:00.000Z",
    isActive: true,
    allocationPercent: 30,
    savingsPotId: "reserva",
  },
  {
    id: "subscription",
    title: "Assinatura",
    amount: 50,
    type: "expense",
    category: "Software",
    cadence: "monthly",
    dayOfMonth: 5,
    startsAt: "2026-05-01T00:00:00.000Z",
    isActive: true,
  },
];

describe("forecast financeiro", () => {
  it("gera ocorrências semanais e mensais dentro do período", () => {
    const occurrences = generateRecurringOccurrences(
      rules,
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-05-31T00:00:00.000Z"),
      new Date("2026-05-01T00:00:00.000Z"),
    );

    expect(occurrences).toHaveLength(7);
    expect(occurrences.filter((occurrence) => occurrence.ruleId === "weekly-income")).toHaveLength(5);
    expect(occurrences.find((occurrence) => occurrence.ruleId === "monthly-income")?.amount).toBe(1700);
  });

  it("calcula valor livre depois de despesas e alocações", () => {
    const forecast = calculateFinanceForecast(
      [
        {
          amount: 100,
          type: "expense",
          status: "confirmed",
          occurredAt: "2026-05-03T00:00:00.000Z",
        },
      ],
      rules,
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-05-31T00:00:00.000Z"),
      new Date("2026-05-01T00:00:00.000Z"),
    );

    expect(forecast.expectedIncome).toBe(3575);
    expect(forecast.expectedExpenses).toBe(50);
    expect(forecast.allocationAmount).toBe(885);
    expect(forecast.allocationsByPot).toEqual({
      viagem: 375,
      reserva: 510,
    });
    expect(forecast.freeToSpend).toBe(2540);
  });

  it("separa valores planejados e atrasados dentro do mês", () => {
    const forecast = calculateFinanceForecast(
      [
        {
          amount: 375,
          type: "income",
          status: "late",
          occurredAt: "2026-05-02T00:00:00.000Z",
        },
        {
          amount: 120,
          type: "expense",
          status: "planned",
          occurredAt: "2026-05-20T00:00:00.000Z",
        },
      ],
      [],
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-05-31T00:00:00.000Z"),
      new Date("2026-05-06T00:00:00.000Z"),
    );

    expect(forecast.lateIncome).toBe(375);
    expect(forecast.plannedExpenses).toBe(120);
    expect(forecast.projectedNet).toBe(255);
  });

  it("remove uma ocorrência recorrente quando ela já virou transação real", () => {
    const forecast = calculateFinanceForecast(
      [
        {
          amount: 375,
          type: "income",
          status: "confirmed",
          occurredAt: "2026-05-03T00:00:00.000Z",
          recurringRuleId: "weekly-income",
          recurringOccurrenceDate: "2026-05-01T00:00:00.000Z",
        },
      ],
      rules,
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-05-31T00:00:00.000Z"),
      new Date("2026-05-01T00:00:00.000Z"),
    );

    expect(forecast.confirmedIncome).toBe(375);
    expect(forecast.occurrences.filter((occurrence) => occurrence.ruleId === "weekly-income")).toHaveLength(4);
    expect(forecast.expectedIncome).toBe(3200);
  });
});
