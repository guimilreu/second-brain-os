import { describe, expect, it } from "vitest";
import { planCardPurchase, planOngoingInstallments, splitAmount } from "./installments";
import { NUBANK_CARD } from "./fixtures.test-utils";

describe("parcelas", () => {
  it("centavos que sobram vão na primeira parcela", () => {
    expect(splitAmount(100_000, 3)).toEqual([33_334, 33_333, 33_333]);
    expect(splitAmount(120_000, 12).every((value) => value === 10_000)).toBe(true);
  });

  it("compra de 30/set em 12x: 1ª na fatura de outubro, última na de setembro/27", () => {
    const plan = planCardPurchase(NUBANK_CARD, "2026-09-30", 120_000, 12);
    expect(plan[0]).toEqual({ index: 1, count: 12, invoiceMonth: "2026-10", amountCents: 10_000 });
    expect(plan[11].invoiceMonth).toBe("2027-09");
  });

  it("parcelamento em andamento gera só as parcelas depois da fatura aberta", () => {
    const plan = planOngoingInstallments("2026-10", 30_000, 4, 10);
    expect(plan).toHaveLength(6);
    expect(plan[0]).toEqual({ index: 5, count: 10, invoiceMonth: "2026-11", amountCents: 30_000 });
    expect(plan[5]).toMatchObject({ index: 10, invoiceMonth: "2027-04" });
  });
});
