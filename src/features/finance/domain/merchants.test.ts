import { describe, expect, it } from "vitest";
import { guessCategoryByMerchant } from "./merchants";
import type { Category } from "./types";

const names = ["Alimentação", "Mercado", "Transporte", "Saúde", "Assinaturas", "Compras", "Impostos e taxas"];
const categories: Category[] = names.map((name, index) => ({
  id: `c${index}`,
  name,
  kind: "expense",
  color: "#000000",
  icon: "tag",
  limitCents: null,
  archived: false,
  sortOrder: index,
  systemKey: null,
}));
const idOf = (name: string) => `c${names.indexOf(name)}`;

describe("palpite por estabelecimento", () => {
  it("reconhece os mais comuns", () => {
    expect(guessCategoryByMerchant("iFood *Burger King", categories)).toBe(idOf("Alimentação"));
    expect(guessCategoryByMerchant("Uber *Trip", categories)).toBe(idOf("Transporte"));
    expect(guessCategoryByMerchant("Farmacia Pague Menos", categories)).toBe(idOf("Saúde"));
    expect(guessCategoryByMerchant("Spotify", categories)).toBe(idOf("Assinaturas"));
    expect(guessCategoryByMerchant("Mercado Extra", categories)).toBe(idOf("Mercado"));
    expect(guessCategoryByMerchant("Netshoes", categories)).toBe(idOf("Compras"));
    expect(guessCategoryByMerchant("IOF de compra internacional", categories)).toBe(idOf("Impostos e taxas"));
  });

  it("o mais específico vence", () => {
    expect(guessCategoryByMerchant("Mercado Livre *Loja", categories)).toBe(idOf("Compras"));
    expect(guessCategoryByMerchant("Amazon Prime Channels", categories)).toBe(idOf("Assinaturas"));
    expect(guessCategoryByMerchant("Amazon Marketplace", categories)).toBe(idOf("Compras"));
  });

  it("não chuta quando não conhece", () => {
    expect(guessCategoryByMerchant("Pagamento João", categories)).toBeNull();
  });
});
