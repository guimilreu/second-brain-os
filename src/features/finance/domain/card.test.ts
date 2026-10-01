import { describe, expect, it } from "vitest";
import { cardReserveNeededCents, cardUsedLimitCents, invoiceDates, invoiceMonthFor, summarizeInvoices } from "./card";
import { NUBANK_CARD, scenarioAccounts, tx } from "./fixtures.test-utils";

describe("ciclo da fatura (fecha 28, vence 5)", () => {
  it("compra de 30/set cai na fatura de outubro, que vence 05/nov", () => {
    const month = invoiceMonthFor(NUBANK_CARD, "2026-09-30");
    expect(month).toBe("2026-10");
    expect(invoiceDates(NUBANK_CARD, month)).toEqual({ closingDate: "2026-10-28", dueDate: "2026-11-05" });
  });

  it("compra antes do fechamento fica na fatura do mês", () => {
    expect(invoiceMonthFor(NUBANK_CARD, "2026-09-27")).toBe("2026-09");
    expect(invoiceDates(NUBANK_CARD, "2026-09").dueDate).toBe("2026-10-05");
  });

  it("compra no dia do fechamento já vai para a próxima", () => {
    expect(invoiceMonthFor(NUBANK_CARD, "2026-09-28")).toBe("2026-10");
  });

  it("fechamento em dia que não existe usa o último dia do mês", () => {
    const card = { ...NUBANK_CARD, closingDay: 31, dueDay: 8 };
    expect(invoiceDates(card, "2027-02").closingDate).toBe("2027-02-28");
    expect(invoiceMonthFor(card, "2027-02-28")).toBe("2027-03");
  });

  it("vencimento depois do fechamento no mesmo mês", () => {
    const card = { ...NUBANK_CARD, closingDay: 3, dueDay: 10 };
    expect(invoiceDates(card, "2026-10")).toEqual({ closingDate: "2026-10-03", dueDate: "2026-10-10" });
  });

  it("datas ajustadas manualmente valem para aquela fatura", () => {
    const card = {
      ...NUBANK_CARD,
      cycleOverrides: [{ month: "2026-10", closingDate: "2026-10-26", dueDate: "2026-11-03" }],
    };
    expect(invoiceMonthFor(card, "2026-10-27")).toBe("2026-11");
    expect(invoiceMonthFor(card, "2026-10-25")).toBe("2026-10");
  });
});

describe("resumo das faturas", () => {
  const card = scenarioAccounts().find((account) => account.id === "nu-card")!;

  it("soma compras, desconta estornos e pagamentos e define o estado", () => {
    const transactions = [
      tx({ type: "expense", amountCents: 150_000, accountId: "nu-card", date: "2026-09-10", invoiceMonth: "2026-09" }),
      tx({ type: "expense", amountCents: 8_000, accountId: "nu-card", date: "2026-09-29", invoiceMonth: "2026-10" }),
      tx({ type: "refund", amountCents: 3_000, accountId: "nu-card", date: "2026-09-30", invoiceMonth: "2026-10" }),
      tx({ type: "expense", amountCents: 30_000, accountId: "nu-card", date: "2026-09-29", invoiceMonth: "2026-11" }),
    ];
    const invoices = summarizeInvoices(card, transactions, "2026-09-30");
    const sep = invoices.find((invoice) => invoice.month === "2026-09")!;
    const oct = invoices.find((invoice) => invoice.month === "2026-10")!;
    const nov = invoices.find((invoice) => invoice.month === "2026-11")!;
    expect(sep).toMatchObject({ state: "closed", remainingCents: 150_000, dueDate: "2026-10-05" });
    expect(oct).toMatchObject({ state: "open", totalCents: 5_000 });
    expect(nov.state).toBe("future");
    expect(cardReserveNeededCents(invoices)).toBe(155_000);
    expect(cardUsedLimitCents(invoices)).toBe(185_000);

    const paid = summarizeInvoices(
      card,
      [
        ...transactions,
        tx({
          type: "transfer",
          amountCents: 150_000,
          accountId: "mp-fatura",
          toAccountId: "nu-card",
          date: "2026-10-05",
          invoiceMonth: "2026-09",
        }),
      ],
      "2026-10-06",
    );
    expect(paid.find((invoice) => invoice.month === "2026-09")!.state).toBe("paid");
  });

  it("fatura fechada não paga depois do vencimento fica atrasada", () => {
    const transactions = [
      tx({ type: "expense", amountCents: 10_000, accountId: "nu-card", date: "2026-09-10", invoiceMonth: "2026-09" }),
    ];
    const invoices = summarizeInvoices(card, transactions, "2026-10-07");
    expect(invoices.find((invoice) => invoice.month === "2026-09")!.state).toBe("overdue");
  });
});
