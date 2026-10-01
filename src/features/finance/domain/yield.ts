import type { Cents } from "./types";

/** Rendimento bruto estimado em um mês, para um saldo que rende `yieldCdiPct`% do CDI anual `cdiAnnualPct`%. */
export function estimatedMonthlyYieldCents(
  balanceCents: Cents,
  cdiAnnualPct: number | null,
  yieldCdiPct: number | null,
): Cents {
  if (!cdiAnnualPct || !yieldCdiPct || balanceCents <= 0) return 0;
  const annualRate = (cdiAnnualPct / 100) * (yieldCdiPct / 100);
  return Math.round(balanceCents * (Math.pow(1 + annualRate, 1 / 12) - 1));
}
