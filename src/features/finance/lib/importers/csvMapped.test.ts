import { describe, expect, it } from "vitest";
import { mapCsvRowsToTransactions, parseCsvContentToTransactions } from "@/features/finance/lib/importers/csvMapped";

describe("csvMapped", () => {
  it("mapeia CSV com cabeçalhos em português", () => {
    const csv = `Data;Valor;Descrição
01/05/2026;120,50;Uber
02/05/2026;3.000,00;Salário`;
    const txs = parseCsvContentToTransactions(csv);
    expect(txs.length).toBe(2);
    expect(txs[0].title).toBe("Uber");
    expect(txs[0].amount).toBeCloseTo(120.5);
    expect(txs[0].type).toBe("expense");
    expect(txs[1].amount).toBeCloseTo(3000);
    expect(txs[1].type).toBe("income");
  });

  it("valor com sinal negativo vira despesa quando há coluna relacionada a tipo", () => {
    const csv = `Data;Valor;Descrição;Tipo
01/05/2026;-50,00;Loja;x`;
    const txs = parseCsvContentToTransactions(csv);
    expect(txs.length).toBe(1);
    expect(txs[0].amount).toBeCloseTo(50);
    expect(txs[0].type).toBe("expense");
  });

  it("dedup estável via externalId", () => {
    const rows = [
      { Data: "01/05/2026", Valor: "10", Descrição: "X" },
      { Data: "01/05/2026", Valor: "10", Descrição: "X" },
    ];
    const a = mapCsvRowsToTransactions(rows);
    const b = mapCsvRowsToTransactions(rows);
    expect(a[0].externalId).toBe(b[0].externalId);
  });
});
