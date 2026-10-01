import type { Cents } from "./types";

export function toCents(reais: number): Cents {
  return Math.round(reais * 100);
}

export function fromCents(cents: Cents): number {
  return cents / 100;
}

/**
 * Lê valor digitado em pt-BR ("1.234,56", "1234,5", "R$ 12") ou com ponto decimal ("12.5").
 * Retorna null se não for um número válido.
 */
export function parseMoneyInput(input: string): Cents | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if ((cleaned.match(/\./g) ?? []).length > 1) {
    normalized = cleaned.replace(/\./g, "");
  } else if (/^\d{1,3}\.\d{3}$/.test(cleaned)) {
    // "1.500" em pt-BR é milhar, não decimal.
    normalized = cleaned.replace(".", "");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? toCents(value) : null;
}

export function sumCents(values: Cents[]): Cents {
  return values.reduce((total, value) => total + value, 0);
}
