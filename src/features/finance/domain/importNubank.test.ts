import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { findExistingCardRow, installmentsFromRow, parseNubankInvoiceCsv } from "./importNubank";
import { tx } from "./fixtures.test-utils";

describe("csv", () => {
  it("lida com aspas, vírgulas no texto e ponto e vírgula", () => {
    expect(parseCsv('a,b\n"x, y","z ""q"""\n')).toEqual([
      ["a", "b"],
      ["x, y", 'z "q"'],
    ]);
    expect(parseCsv("data;valor\n01/10/2026;12,50")).toEqual([
      ["data", "valor"],
      ["01/10/2026", "12,50"],
    ]);
  });
});

describe("fatura do Nubank", () => {
  const csv = [
    "date,title,amount",
    "2026-09-29,iFood *Restaurante,42.90",
    "2026-09-30,Magazine Luiza - Parcela 3/10,300.00",
    "2026-10-02,Estorno de compra,-15.00",
    "2026-10-05,Pagamento recebido,-1500.00",
    "2026-10-06,Uber *Trip,23.45",
  ].join("\n");

  it("classifica compras, parcelas, estornos e pagamentos", () => {
    const { rows, errors } = parseNubankInvoiceCsv(csv);
    expect(errors).toEqual([]);
    expect(rows.map((row) => row.kind)).toEqual(["charge", "charge", "refund", "payment", "charge"]);
    expect(rows[0]).toMatchObject({ date: "2026-09-29", description: "iFood *Restaurante", amountCents: 4_290 });
    expect(rows[1]).toMatchObject({ description: "Magazine Luiza", installment: { index: 3, count: 10 }, amountCents: 30_000 });
  });

  it("aceita cabeçalho em português e valores com vírgula", () => {
    const { rows } = parseNubankInvoiceCsv("Data;Descrição;Valor\n29/09/2026;Padaria;1.234,56");
    expect(rows[0]).toMatchObject({ date: "2026-09-29", description: "Padaria", amountCents: 123_456 });
  });

  it("avisa quando não reconhece as colunas", () => {
    expect(parseNubankInvoiceCsv("foo,bar\n1,2").errors).toHaveLength(1);
  });

  it("detecta o que já está lançado", () => {
    const { rows } = parseNubankInvoiceCsv(csv);
    const existing = [
      tx({ type: "expense", amountCents: 4_290, accountId: "nu-card", date: "2026-09-29", description: "ifood restaurante", invoiceMonth: "2026-10" }),
      tx({
        type: "expense",
        amountCents: 30_000,
        accountId: "nu-card",
        date: "2026-07-01",
        description: "Magazine Luiza",
        invoiceMonth: "2026-10",
        installment: { groupId: "g", index: 3, count: 10 },
      }),
    ];
    expect(findExistingCardRow(rows[0], "2026-10", existing)).toBe(existing[0].id);
    expect(findExistingCardRow(rows[1], "2026-10", existing)).toBe(existing[1].id);
    expect(findExistingCardRow(rows[4], "2026-10", existing)).toBeNull();
  });

  it("parcela 3/10 gera da 3 à 10", () => {
    const { rows } = parseNubankInvoiceCsv(csv);
    expect(installmentsFromRow(rows[1]).map((item) => item.index)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
