/** Rendimento composto simples: taxa mensal fixa. */
export function projectFixedIncome(principal: number, rateMonthly: number, months: number) {
  let v = principal;
  for (let i = 0; i < months; i += 1) {
    v *= 1 + rateMonthly;
  }
  return Math.round(v * 100) / 100;
}
