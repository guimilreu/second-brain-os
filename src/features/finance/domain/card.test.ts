import { describe, expect, it } from "vitest";
import {
  cardReserveNeededCents,
  cardUsedLimitCents,
  defaultSettledMonth,
  invoiceDates,
  invoiceMonthFor,
  summarizeInvoices,
} from "./card";
import { isBankHoliday } from "./dates";
import { NUBANK_CARD, scenarioAccounts, tx } from "./fixtures.test-utils";

describe("ciclo da fatura (vence dia 5, fecha 7 dias antes — regra do Nubank)", () => {
  it("o fechamento muda conforme o mês: setembro fechou 28/09, outubro fecha 29/10", () => {
    expect(invoiceDates(NUBANK_CARD, "2026-09")).toEqual({ closingDate: "2026-09-28", dueDate: "2026-10-05" });
    expect(invoiceDates(NUBANK_CARD, "2026-10")).toEqual({ closingDate: "2026-10-29", dueDate: "2026-11-05" });
    // Fevereiro curto: vence 05/03 → fecha 26/02.
    expect(invoiceDates(NUBANK_CARD, "2027-02").closingDate).toBe("2027-02-26");
  });

  it("compra de 30/set cai na fatura de outubro, que vence 05/nov", () => {
    expect(invoiceMonthFor(NUBANK_CARD, "2026-09-30")).toBe("2026-10");
  });

  it("compra antes do fechamento fica na fatura do mês; no dia do fechamento já vai para a próxima", () => {
    expect(invoiceMonthFor(NUBANK_CARD, "2026-09-27")).toBe("2026-09");
    expect(invoiceMonthFor(NUBANK_CARD, "2026-09-28")).toBe("2026-10");
    expect(invoiceMonthFor(NUBANK_CARD, "2026-10-28")).toBe("2026-10");
    expect(invoiceMonthFor(NUBANK_CARD, "2026-10-29")).toBe("2026-11");
  });

  it("vencimento no meio do mês fecha no mesmo mês", () => {
    const card = { ...NUBANK_CARD, dueDay: 15 };
    expect(invoiceDates(card, "2026-10")).toEqual({ closingDate: "2026-10-08", dueDate: "2026-10-15" });
  });

  it("datas ajustadas à mão valem para aquela fatura", () => {
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
    expect(sep).toMatchObject({ state: "closed", remainingCents: 150_000, dueDate: "2026-10-05", settledOutside: false });
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

describe("faturas pagas antes do app", () => {
  it("compra parcelada antiga: as parcelas das faturas já pagas viram histórico, o resto é dívida", () => {
    const base = scenarioAccounts().find((account) => account.id === "nu-card")!;
    const card = { ...base, card: { ...base.card!, settledThroughMonth: "2026-08" } };
    // Notebook comprado em 10/06 em 10x de R$ 300: faturas de jun/26 a mar/27.
    const transactions = Array.from({ length: 10 }, (_, index) =>
      tx({
        type: "expense",
        amountCents: 30_000,
        accountId: "nu-card",
        date: "2026-06-10",
        invoiceMonth: `${index < 7 ? "2026" : "2027"}-${String(((5 + index) % 12) + 1).padStart(2, "0")}`,
        installment: { groupId: "nb", index: index + 1, count: 10 },
      }),
    );
    const invoices = summarizeInvoices(card, transactions, "2026-10-02");
    const august = invoices.find((invoice) => invoice.month === "2026-08")!;
    expect(august).toMatchObject({ state: "paid", settledOutside: true, remainingCents: 0 });
    expect(invoices.find((invoice) => invoice.month === "2026-09")!.state).toBe("closed");
    // Dívida = parcelas 4 a 10 (set/26 a mar/27).
    expect(cardUsedLimitCents(invoices)).toBe(7 * 30_000);
    // Reserva: fatura de setembro (fechada) + outubro (aberta).
    expect(cardReserveNeededCents(invoices)).toBe(2 * 30_000);
  });
});

describe("vencimento em dia útil (datas reais do Nubank)", () => {
  it("fim de semana e feriado empurram o vencimento; o fechamento continua 7 dias antes do dia 5", () => {
    // 05/07/2026 é domingo → segunda 06/07.
    expect(invoiceDates(NUBANK_CARD, "2026-06")).toEqual({ closingDate: "2026-06-28", dueDate: "2026-07-06" });
    // 05/09/2026 é sábado e 07/09 é feriado → terça 08/09.
    expect(invoiceDates(NUBANK_CARD, "2026-08")).toEqual({ closingDate: "2026-08-29", dueDate: "2026-09-08" });
    // 05/12/2026 é sábado → segunda 07/12.
    expect(invoiceDates(NUBANK_CARD, "2026-11")).toEqual({ closingDate: "2026-11-28", dueDate: "2026-12-07" });
  });

  it("feriados móveis batem com o calendário da FEBRABAN de 2026", () => {
    for (const date of ["2026-02-16", "2026-02-17", "2026-04-03", "2026-06-04", "2026-09-07", "2026-11-20"]) {
      expect(isBankHoliday(date)).toBe(true);
    }
    expect(isBankHoliday("2026-02-18")).toBe(false);
  });

  it("pagar no dia útil seguinte não é atraso", () => {
    const [card] = scenarioAccounts().filter((account) => account.id === "nu-card");
    const charge = tx({ type: "expense", amountCents: 10_000, accountId: "nu-card", date: "2026-08-10", invoiceMonth: "2026-08" });
    const onTime = summarizeInvoices(card, [charge], "2026-09-07").find((invoice) => invoice.month === "2026-08");
    const late = summarizeInvoices(card, [charge], "2026-09-09").find((invoice) => invoice.month === "2026-08");
    expect(onTime?.state).toBe("closed");
    expect(late?.state).toBe("overdue");
  });
});

describe("até qual fatura já estava paga", () => {
  it("palpite: a fatura fechada mais recente que já venceu", () => {
    // 02/10: setembro fechou 28/09 mas só vence 05/10 → agosto.
    expect(defaultSettledMonth(NUBANK_CARD, "2026-10-02")).toBe("2026-08");
    expect(defaultSettledMonth(NUBANK_CARD, "2026-10-05")).toBe("2026-08");
    expect(defaultSettledMonth(NUBANK_CARD, "2026-10-06")).toBe("2026-09");
    // No dia do fechamento a fatura já está fechada, mas ainda não venceu.
    expect(defaultSettledMonth(NUBANK_CARD, "2026-10-29")).toBe("2026-09");
  });
});
