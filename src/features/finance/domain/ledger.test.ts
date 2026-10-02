import { describe, expect, it } from "vitest";
import { balancesByAccount, competenceOf } from "./ledger";
import { scenarioAccounts, tx } from "./fixtures.test-utils";

describe("competência", () => {
  it("cartão conta no mês da fatura; o resto, na data", () => {
    expect(competenceOf({ type: "expense", date: "2026-09-30", invoiceMonth: "2026-10" })).toBe("2026-10");
    expect(competenceOf({ type: "expense", date: "2026-09-30", invoiceMonth: null })).toBe("2026-09");
    // Pagamento de fatura é movimento de caixa: conta na data.
    expect(competenceOf({ type: "transfer", date: "2026-10-05", invoiceMonth: "2026-09" })).toBe("2026-10");
  });
});

describe("saldos", () => {
  const accounts = scenarioAccounts();

  it("PIX sai do cofre, compra no cartão vira dívida e pagar a fatura zera os dois lados", () => {
    const balances = balancesByAccount(accounts, [
      tx({ type: "expense", amountCents: 5_000, accountId: "mp-saldo", date: "2026-09-10" }),
      tx({ type: "expense", amountCents: 20_000, accountId: "nu-card", date: "2026-09-10", invoiceMonth: "2026-09" }),
      tx({
        type: "transfer",
        amountCents: 20_000,
        accountId: "mp-fatura",
        toAccountId: "nu-card",
        date: "2026-10-05",
        invoiceMonth: "2026-09",
      }),
    ]);
    expect(balances.get("mp-saldo")).toBe(795_000);
    expect(balances.get("nu-card")).toBe(0);
    expect(balances.get("mp-fatura")).toBe(130_000);
  });

  it("compra retroativa em fatura paga antes do app não vira dívida; a parcela que ainda vem, vira", () => {
    const settled = accounts.map((account) =>
      account.card ? { ...account, card: { ...account.card, settledThroughMonth: "2026-08" } } : account,
    );
    const balances = balancesByAccount(settled, [
      tx({ type: "expense", amountCents: 30_000, accountId: "nu-card", date: "2026-07-10", invoiceMonth: "2026-07" }),
      tx({ type: "expense", amountCents: 30_000, accountId: "nu-card", date: "2026-07-10", invoiceMonth: "2026-08" }),
      tx({ type: "expense", amountCents: 30_000, accountId: "nu-card", date: "2026-07-10", invoiceMonth: "2026-09" }),
    ]);
    expect(balances.get("nu-card")).toBe(-30_000);
  });

  it("lançamento anterior ao saldo inicial não mexe no saldo (já está nele)", () => {
    const balances = balancesByAccount(accounts, [
      tx({ type: "income", amountCents: 1_000_000, accountId: "mp-saldo", date: "2026-08-31" }),
    ]);
    expect(balances.get("mp-saldo")).toBe(800_000);
  });
});
