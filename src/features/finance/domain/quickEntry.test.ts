import { describe, expect, it } from "vitest";
import { parseMoneyInput } from "./money";
import { normalizeDescription, parseQuickEntry, resolveAccountForHints } from "./quickEntry";
import { scenarioAccounts } from "./fixtures.test-utils";

describe("valor digitado", () => {
  it("entende pt-BR e ponto decimal", () => {
    expect(parseMoneyInput("1.234,56")).toBe(123_456);
    expect(parseMoneyInput("42,9")).toBe(4_290);
    expect(parseMoneyInput("R$ 12")).toBe(1_200);
    expect(parseMoneyInput("12.50")).toBe(1_250);
    expect(parseMoneyInput("1.500")).toBe(150_000);
    expect(parseMoneyInput("abc")).toBeNull();
  });
});

describe("lançamento em linguagem natural", () => {
  it("ifood 42,90 nubank", () => {
    expect(parseQuickEntry("ifood 42,90 nubank", "2026-09-30")).toMatchObject({
      description: "ifood",
      amountCents: 4_290,
      institution: "nubank",
      installments: null,
    });
  });

  it("notebook 3600 12x cartão", () => {
    expect(parseQuickEntry("notebook 3600 12x cartão", "2026-09-30")).toMatchObject({
      description: "notebook",
      amountCents: 360_000,
      installments: 12,
      method: "credit",
    });
  });

  it("uber 23 pix ontem e data dd/mm", () => {
    expect(parseQuickEntry("uber 23 pix ontem", "2026-09-30")).toMatchObject({
      description: "uber",
      amountCents: 2_300,
      method: "pix",
      date: "2026-09-29",
    });
    expect(parseQuickEntry("farmácia 18,50 28/09", "2026-09-30").date).toBe("2026-09-28");
  });

  it("resolve a conta pelos indícios", () => {
    const accounts = scenarioAccounts();
    expect(resolveAccountForHints(accounts, { institution: "nubank", method: null })?.id).toBe("nu-conta");
    expect(resolveAccountForHints(accounts, { institution: null, method: "credit" })?.id).toBe("nu-card");
    expect(resolveAccountForHints(accounts, { institution: "mercadopago", method: "pix" })?.id).toBe("mp-saldo");
    expect(resolveAccountForHints(accounts, { institution: null, method: null })).toBeNull();
  });

  it("normaliza descrição para aprender por histórico", () => {
    expect(normalizeDescription("iFood *Pedido 1234")).toBe("ifood pedido");
  });
});
