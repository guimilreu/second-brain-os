import { describe, expect, it } from "vitest";
import { buildInsights } from "./insights";
import { CATEGORIES, recurring, scenarioAccounts, tx } from "./fixtures.test-utils";

const accounts = scenarioAccounts();

function insightsFor(transactions: ReturnType<typeof tx>[], today: string, recurrings = [] as ReturnType<typeof recurring>[]) {
  return buildInsights(
    { accounts, categories: CATEGORIES, transactions, recurrings, today },
    { cdiAnnualPct: 14.9 },
  );
}

describe("avisos", () => {
  it("fatura fechada vencendo e reserva faltando no cofre Fatura", () => {
    const transactions = [
      tx({ type: "expense", amountCents: 200_000, accountId: "nu-card", date: "2026-09-10", invoiceMonth: "2026-09" }),
      tx({ type: "expense", amountCents: 30_000, accountId: "nu-card", date: "2026-09-29", invoiceMonth: "2026-10" }),
    ];
    const insights = insightsFor(transactions, "2026-10-02");
    const due = insights.find((item) => item.id === "due-nu-card-2026-09");
    expect(due?.title).toContain("vence em 3 dias");
    expect(due?.action).toMatchObject({ kind: "pay-invoice", fromAccountId: "mp-fatura", amountCents: 200_000 });
    // Precisa de 2.300 (fechada + aberta); o cofre tem 1.500.
    const reserve = insights.find((item) => item.id === "reserve-nu-card");
    expect(reserve?.action).toMatchObject({ kind: "reserve", fromAccountId: "mp-saldo", toAccountId: "mp-fatura", amountCents: 80_000 });
  });

  it("fatura atrasada é o primeiro aviso", () => {
    const transactions = [
      tx({ type: "expense", amountCents: 10_000, accountId: "nu-card", date: "2026-09-10", invoiceMonth: "2026-09" }),
    ];
    const insights = insightsFor(transactions, "2026-10-07");
    expect(insights[0].tone).toBe("negative");
    expect(insights[0].id).toBe("overdue-nu-card-2026-09");
  });

  it("fixa vencida pede confirmação; automática não", () => {
    const recurrings = [
      recurring({ id: "aluguel", type: "expense", amountCents: 200_000, accountId: "mp-saldo", dayOfMonth: 10, startMonth: "2026-10" }),
      recurring({ id: "streaming", type: "expense", amountCents: 5_500, accountId: "nu-card", dayOfMonth: 5, startMonth: "2026-10", autoPost: true }),
    ];
    const ids = insightsFor([], "2026-10-12", recurrings).map((item) => item.id);
    expect(ids).toContain("recurring-aluguel-2026-10");
    expect(ids).not.toContain("recurring-streaming-2026-10");
  });

  it("parcela terminando e próxima fatura comprometida", () => {
    const group = { groupId: "note", count: 10 };
    const transactions = [
      tx({ type: "expense", amountCents: 30_000, accountId: "nu-card", date: "2026-01-10", invoiceMonth: "2026-10", installment: { ...group, index: 10 }, description: "Notebook" }),
      tx({ type: "expense", amountCents: 20_000, accountId: "nu-card", date: "2026-09-10", invoiceMonth: "2026-11", installment: { groupId: "tv", index: 2, count: 5 }, description: "TV" }),
    ];
    const insights = insightsFor(transactions, "2026-10-15");
    expect(insights.find((item) => item.id === "installment-end-note")?.detail).toContain("novembro");
    expect(insights.find((item) => item.id === "next-installments-nu-card-2026-11")?.title).toContain("Fatura de novembro");
  });

  it("dinheiro parado no saldo em conta sugere o cofre que rende mais", () => {
    const transactions = [tx({ type: "income", amountCents: 300_000, accountId: "mp-conta", date: "2026-10-05" })];
    const idle = insightsFor(transactions, "2026-10-06").find((item) => item.id === "idle-mp-conta");
    expect(idle?.action).toMatchObject({ kind: "move-money", fromAccountId: "mp-conta", toAccountId: "mp-saldo", amountCents: 300_000 });
    expect(idle?.detail).toContain("a mais por mês");
  });

  it("cobrança duplicada", () => {
    const transactions = [
      tx({ type: "expense", amountCents: 4_290, accountId: "nu-card", date: "2026-10-10", invoiceMonth: "2026-10", description: "iFood *Pedido 1" }),
      tx({ type: "expense", amountCents: 4_290, accountId: "nu-card", date: "2026-10-10", invoiceMonth: "2026-10", description: "iFood *Pedido 2" }),
    ];
    expect(insightsFor(transactions, "2026-10-12").some((item) => item.id.startsWith("duplicate-"))).toBe(true);
  });

  it("no começo do mês lembra de registrar o rendimento do mês anterior, até ele ser lançado", () => {
    const yieldCategory = { ...CATEGORIES[4], id: "yield", name: "Rendimentos", systemKey: "yield" as const };
    const categories = [...CATEGORIES, yieldCategory];
    const run = (transactions: ReturnType<typeof tx>[], today: string) =>
      buildInsights({ accounts, categories, transactions, recurrings: [], today }, { cdiAnnualPct: 14.9 }).map(
        (item) => item.id,
      );
    expect(run([], "2026-11-03")).toContain("yields-2026-10");
    expect(run([], "2026-11-20")).not.toContain("yields-2026-10");
    const recorded = tx({ type: "income", amountCents: 9_800, accountId: "mp-saldo", date: "2026-10-31", categoryId: "yield" });
    expect(run([recorded], "2026-11-03")).not.toContain("yields-2026-10");
  });
});
