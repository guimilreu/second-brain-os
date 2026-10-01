import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { scenarioAccounts, tx } from "@/features/finance/domain/fixtures.test-utils";
import { buildEntryDocs, rebucketCardTransactions, type EntryInput } from "./writes";

const accounts = scenarioAccounts();
const accountsById = new Map(accounts.map((account) => [account.id, account]));
const userId = new Types.ObjectId().toString();
// Os ids do cenário de teste não são ObjectId; para montar documentos usamos contas com ids válidos.
const cardId = new Types.ObjectId().toString();
const saldoId = new Types.ObjectId().toString();
const validAccounts = new Map([
  [cardId, { ...accountsById.get("nu-card")!, id: cardId }],
  [saldoId, { ...accountsById.get("mp-saldo")!, id: saldoId }],
]);

function entry(partial: Partial<EntryInput>): EntryInput {
  return {
    type: "expense",
    amountCents: 120_000,
    description: "Notebook",
    categoryId: null,
    accountId: cardId,
    toAccountId: null,
    date: "2026-09-30",
    method: null,
    notes: "",
    installments: 1,
    amountMode: "total",
    invoiceMonth: null,
    recurringId: null,
    recurringMonth: null,
    ...partial,
  };
}

describe("montagem dos lançamentos", () => {
  it("compra parcelada no cartão: uma parcela por fatura, mesmo grupo", () => {
    const docs = buildEntryDocs(userId, entry({ installments: 12 }), validAccounts);
    expect(docs).toHaveLength(12);
    expect(docs[0]).toMatchObject({ invoiceMonth: "2026-10", competence: "2026-10", amountCents: 10_000, method: "credit" });
    expect(docs[11].invoiceMonth).toBe("2027-09");
    expect(new Set(docs.map((doc) => doc.installment?.groupId)).size).toBe(1);
  });

  it("valor da parcela e fatura escolhida à mão", () => {
    const docs = buildEntryDocs(
      userId,
      entry({ installments: 3, amountMode: "installment", amountCents: 5_000, invoiceMonth: "2026-11" }),
      validAccounts,
    );
    expect(docs.map((doc) => [doc.invoiceMonth, doc.amountCents, doc.invoiceLocked])).toEqual([
      ["2026-11", 5_000, true],
      ["2026-12", 5_000, true],
      ["2027-01", 5_000, true],
    ]);
  });

  it("PIX conta no mês da data; parcelar fora do cartão é recusado", () => {
    const [pix] = buildEntryDocs(userId, entry({ accountId: saldoId, amountCents: 4_000 }), validAccounts);
    expect(pix).toMatchObject({ competence: "2026-09", invoiceMonth: null });
    expect(() => buildEntryDocs(userId, entry({ accountId: saldoId, installments: 3 }), validAccounts)).toThrow(
      "Parcelamento só existe no cartão de crédito.",
    );
  });

  it("transferência para o próprio lugar é recusada; para o cartão leva a fatura paga", () => {
    expect(() =>
      buildEntryDocs(userId, entry({ type: "transfer", accountId: saldoId, toAccountId: saldoId }), validAccounts),
    ).toThrow("Origem e destino precisam ser diferentes.");
    const [payment] = buildEntryDocs(
      userId,
      entry({ type: "transfer", accountId: saldoId, toAccountId: cardId, invoiceMonth: "2026-09", date: "2026-10-05" }),
      validAccounts,
    );
    expect(payment).toMatchObject({ type: "transfer", invoiceMonth: "2026-09", competence: "2026-10" });
  });
});

describe("reposicionar compras quando o fechamento muda", () => {
  it("move compras e parcelas pela data, respeitando as movidas à mão", () => {
    const card = accounts.find((account) => account.id === "nu-card")!;
    const moved = { ...card, card: { ...card.card!, closingDay: 25 } };
    const purchase = { ...tx({ type: "expense", amountCents: 1_000, accountId: "nu-card", date: "2026-09-26", invoiceMonth: "2026-09" }), invoiceLocked: false };
    const locked = { ...tx({ type: "expense", amountCents: 1_000, accountId: "nu-card", date: "2026-09-26", invoiceMonth: "2026-09" }), invoiceLocked: true };
    const second = {
      ...tx({
        type: "expense",
        amountCents: 1_000,
        accountId: "nu-card",
        date: "2026-09-26",
        invoiceMonth: "2026-10",
        installment: { groupId: "g", index: 2, count: 3 },
      }),
      invoiceLocked: false,
    };
    expect(rebucketCardTransactions(moved, [purchase, locked, second])).toEqual([
      { id: purchase.id, invoiceMonth: "2026-10" },
      { id: second.id, invoiceMonth: "2026-11" },
    ]);
  });
});
