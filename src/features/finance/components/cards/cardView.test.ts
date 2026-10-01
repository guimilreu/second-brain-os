import { describe, expect, it } from "vitest";
import { addMonths } from "@/features/finance/domain/dates";
import { CATEGORIES, recurring, scenarioAccounts, tx } from "@/features/finance/domain/fixtures.test-utils";
import type { Transaction } from "@/features/finance/domain/types";
import { isEmptyInvoice } from "./cardLabels";
import { buildCardScreen, isCardAccount, type CardAccount } from "./cardView";

const accounts = scenarioAccounts();
const card = ((): CardAccount => {
  const account = accounts.find((item) => item.id === "nu-card");
  if (!account || !isCardAccount(account)) throw new Error("fixture sem cartão");
  return account;
})();

// Notebook em 10x: parcelas de jul/26 a abr/27 (a 3ª está na fatura fechada de setembro).
const notebook = Array.from({ length: 10 }, (_, index) =>
  tx({
    type: "expense",
    amountCents: 30_000,
    accountId: "nu-card",
    date: "2026-06-30",
    invoiceMonth: addMonths("2026-07", index),
    categoryId: "shop",
    installment: { groupId: "note", index: index + 1, count: 10 },
  }),
);

const baseTransactions: Transaction[] = [
  ...notebook,
  tx({ type: "expense", amountCents: 20_000, accountId: "nu-card", date: "2026-08-10", invoiceMonth: "2026-08", categoryId: "food" }),
  tx({ type: "transfer", amountCents: 30_000, accountId: "mp-fatura", toAccountId: "nu-card", date: "2026-08-05", invoiceMonth: "2026-07" }),
  tx({ type: "transfer", amountCents: 50_000, accountId: "mp-fatura", toAccountId: "nu-card", date: "2026-09-05", invoiceMonth: "2026-08" }),
  tx({ type: "expense", amountCents: 150_000, accountId: "nu-card", date: "2026-09-10", invoiceMonth: "2026-09", categoryId: "food" }),
  tx({ type: "expense", amountCents: 5_500, accountId: "nu-card", date: "2026-09-15", invoiceMonth: "2026-09", categoryId: "subs", recurringId: "streaming", recurringMonth: "2026-09" }),
  tx({ type: "expense", amountCents: 8_000, accountId: "nu-card", date: "2026-09-29", invoiceMonth: "2026-10", categoryId: "food" }),
  tx({ type: "refund", amountCents: 3_000, accountId: "nu-card", date: "2026-09-30", invoiceMonth: "2026-10", categoryId: "food" }),
];

const recurrings = [
  recurring({ id: "streaming", type: "expense", amountCents: 5_500, accountId: "nu-card", dayOfMonth: 15, categoryId: "subs", autoPost: true }),
];

function screen(transactions: Transaction[], month: string | null = null) {
  return buildCardScreen({ accounts, categories: CATEGORIES, recurrings, transactions, today: "2026-09-30" }, card, month);
}

describe("tela do cartão (fecha 28, vence 5; hoje 30/09)", () => {
  it("abre na fatura fechada em aberto e mostra o que pagar e o que guardar", () => {
    const view = screen(baseTransactions);

    expect(view.openMonth).toBe("2026-10");
    expect(view.selected).toMatchObject({
      month: "2026-09",
      state: "closed",
      totalCents: 185_500,
      remainingCents: 185_500,
      dueDate: "2026-10-05",
      periodStart: "2026-08-28",
      periodEnd: "2026-09-27",
      breakdown: { installmentsCents: 30_000, fixedCents: 5_500, predictedCents: 0, otherCents: 150_000 },
    });
    expect(view.items.purchases).toHaveLength(1);
    expect(view.items.installments.map((item) => item.installment?.index)).toEqual([3]);
    expect(view.items.fixed).toHaveLength(1);
    expect(view.items.predicted).toHaveLength(0);
    expect(view.categories).toEqual([
      { categoryId: "food", cents: 150_000 },
      { categoryId: "shop", cents: 30_000 },
      { categoryId: "subs", cents: 5_500 },
    ]);

    // Setembro inteiro + o que já está em outubro; no cofre ficou R$ 1.000 depois de pagar agosto.
    expect(view.reserve).toMatchObject({ balanceCents: 100_000, neededCents: 220_500 });
    expect(view.drafts.reserve).toMatchObject({ accountId: "mp-saldo", toAccountId: "mp-fatura", amountCents: 120_500 });
    expect(view.drafts.payDue).toMatchObject({
      type: "transfer",
      accountId: "mp-fatura",
      toAccountId: "nu-card",
      amountCents: 185_500,
      invoiceMonth: "2026-09",
      title: "Pagar Fatura de setembro",
    });
    expect(view.drafts.paySelected).toEqual(view.drafts.payDue);
    // Inclui as parcelas futuras (o banco segura o valor cheio).
    expect(view.limit).toEqual({ limitCents: 1_000_000, usedCents: 185_500 + 35_000 + 6 * 30_000 });
  });

  it("previsão da aberta e das futuras soma parcelas e fixas ainda não lançadas", () => {
    const view = screen(baseTransactions);
    const october = view.timeline.find((item) => item.month === "2026-10")!;
    expect(october).toMatchObject({ state: "open", totalCents: 35_000, forecastCents: 40_500 });

    expect(view.timeline.map((item) => item.month)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
    ]);
    expect(view.commitments).toHaveLength(12);
    expect(view.commitments[0]).toMatchObject({ month: "2026-10", installmentsCents: 30_000, fixedCents: 5_500, otherCents: 5_000, totalCents: 40_500 });
    expect(view.commitments[7]).toMatchObject({ month: "2027-05", installmentsCents: 0, fixedCents: 5_500, totalCents: 5_500 });

    expect(view.plans).toEqual([
      expect.objectContaining({ groupId: "note", nextIndex: 4, nextMonth: "2026-10", remainingCount: 7, remainingCents: 210_000, endMonth: "2027-04" }),
    ]);

    const november = screen(baseTransactions, "2026-11");
    expect(november.selected).toMatchObject({ state: "future", forecastCents: 35_500 });
    expect(november.items.predicted.map((item) => item.date)).toEqual(["2026-11-15"]);
    expect(november.drafts.paySelected).toBeNull();
  });

  it("com a fechada paga, abre na aberta e só a aberta precisa estar guardada", () => {
    const paid = [
      ...baseTransactions,
      tx({ type: "transfer", amountCents: 185_500, accountId: "mp-fatura", toAccountId: "nu-card", date: "2026-09-30", invoiceMonth: "2026-09" }),
    ];
    const view = screen(paid);
    expect(view.selected.month).toBe("2026-10");
    expect(view.drafts.payDue).toBeNull();
    expect(view.reserve.neededCents).toBe(35_000);
    expect(view.timeline.find((item) => item.month === "2026-09")).toMatchObject({ state: "paid", lastPaymentDate: "2026-09-30" });
  });

  it("fatura antiga sem movimento aparece vazia, não como paga", () => {
    const view = screen(baseTransactions, "2025-01");
    expect(view.selected.itemCount).toBe(0);
    expect(isEmptyInvoice(view.selected)).toBe(true);
  });
});
