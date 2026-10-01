import { describe, expect, it } from "vitest";
import { computeMonthPlan } from "./plan";
import { CATEGORIES, recurring, scenarioAccounts, tx } from "./fixtures.test-utils";

const accounts = scenarioAccounts();
const base = { accounts, categories: CATEGORIES };

describe("plano do mês", () => {
  it("separa fixas, parcelas, guardar e dia a dia; cartão conta no mês da fatura", () => {
    const transactions = [
      tx({ type: "income", amountCents: 1_000_000, accountId: "mp-saldo", date: "2026-10-05", recurringId: "salario", recurringMonth: "2026-10" }),
      tx({ type: "expense", amountCents: 200_000, accountId: "mp-saldo", date: "2026-10-10", categoryId: "home", recurringId: "aluguel", recurringMonth: "2026-10" }),
      tx({ type: "expense", amountCents: 30_000, accountId: "nu-card", date: "2026-07-15", invoiceMonth: "2026-10", installment: { groupId: "note", index: 4, count: 10 }, categoryId: "shop" }),
      tx({ type: "expense", amountCents: 8_000, accountId: "nu-card", date: "2026-09-29", invoiceMonth: "2026-10", categoryId: "food" }),
      tx({ type: "expense", amountCents: 4_000, accountId: "mp-saldo", date: "2026-10-12", categoryId: "food" }),
      tx({ type: "refund", amountCents: 1_000, accountId: "mp-saldo", date: "2026-10-12", categoryId: "food" }),
      // Compra depois do fechamento de outubro: só conta em novembro.
      tx({ type: "expense", amountCents: 50_000, accountId: "nu-card", date: "2026-10-29", invoiceMonth: "2026-11", categoryId: "shop" }),
      // Guardar na reserva da fatura não é gasto nem poupança.
      tx({ type: "transfer", amountCents: 38_000, accountId: "mp-saldo", toAccountId: "mp-fatura", date: "2026-10-12" }),
    ];
    const recurrings = [
      recurring({ id: "salario", type: "income", amountCents: 1_000_000, accountId: "mp-saldo", dayOfMonth: 5 }),
      recurring({ id: "aluguel", type: "expense", amountCents: 200_000, accountId: "mp-saldo", dayOfMonth: 10, categoryId: "home" }),
      recurring({ id: "internet", type: "expense", amountCents: 10_000, accountId: "mp-saldo", dayOfMonth: 20, categoryId: "home" }),
      // Assinatura no cartão no dia 30: cai na fatura do mês seguinte.
      recurring({ id: "streaming", type: "expense", amountCents: 5_500, accountId: "nu-card", dayOfMonth: 30, categoryId: "subs", autoPost: true }),
    ];
    const plan = computeMonthPlan({ ...base, transactions, recurrings, today: "2026-10-15" }, "2026-10");

    expect(plan.income).toEqual({ receivedCents: 1_000_000, expectedCents: 0, totalCents: 1_000_000 });
    // Aluguel pago + internet prevista + streaming de 30/set (cai na fatura de outubro).
    expect(plan.fixed).toEqual({ paidCents: 200_000, expectedCents: 15_500, totalCents: 215_500 });
    expect(plan.installmentsCents).toBe(30_000);
    expect(plan.savings).toMatchObject({ plannedCents: 50_000, depositedCents: 0, totalCents: 50_000 });
    expect(plan.variableCents).toBe(11_000);
    expect(plan.availableCents).toBe(1_000_000 - 215_500 - 30_000 - 50_000);
    expect(plan.freeCents).toBe(plan.availableCents - 11_000);
    expect(plan.daysLeft).toBe(17);
    expect(plan.perDayCents).toBe(Math.floor(plan.freeCents / 17));

    const food = plan.categories.find((line) => line.categoryId === "food")!;
    expect(food).toMatchObject({ spentCents: 11_000, limitCents: 100_000 });

    const november = computeMonthPlan({ ...base, transactions, recurrings, today: "2026-10-15" }, "2026-11");
    expect(november.variableCents).toBe(50_000);
    expect(november.income.expectedCents).toBe(1_000_000);
  });

  it("depósito na meta conta como guardado; retirada devolve para o mês", () => {
    const transactions = [
      tx({ type: "transfer", amountCents: 70_000, accountId: "mp-saldo", toAccountId: "mp-viagem", date: "2026-10-02" }),
      tx({ type: "transfer", amountCents: 10_000, accountId: "mp-viagem", toAccountId: "mp-saldo", date: "2026-10-03" }),
    ];
    const plan = computeMonthPlan({ ...base, transactions, recurrings: [], today: "2026-10-15" }, "2026-10");
    expect(plan.savings).toMatchObject({ plannedCents: 50_000, depositedCents: 70_000, withdrawnCents: 10_000, totalCents: 60_000 });
  });

  it("mês passado não conta previsões nem meta não cumprida", () => {
    const recurrings = [recurring({ id: "internet", type: "expense", amountCents: 10_000, accountId: "mp-saldo", dayOfMonth: 20 })];
    const plan = computeMonthPlan({ ...base, transactions: [], recurrings, today: "2026-10-15" }, "2026-09");
    expect(plan.fixed.totalCents).toBe(0);
    expect(plan.savings.totalCents).toBe(0);
    expect(plan.perDayCents).toBeNull();
  });
});
