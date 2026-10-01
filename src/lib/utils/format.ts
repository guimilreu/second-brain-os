export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Centavos → "R$ 1.234,56". */
export function formatCents(cents: number) {
  return formatCurrency(cents / 100);
}

/** Centavos → "1.234,56" (para preencher campos de valor). */
export function centsToInput(cents: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

/** Centavos → "R$ 1,2 mil" (eixos de gráfico). */
export function formatCompactCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}
