import { addMonths } from "date-fns";

/** Parcela fixa (PMT) — taxa mensal decimal (ex.: 0.01 = 1%/mês). */
export function calculatePMT(
  principal: number,
  rateMonthly: number,
  periods: number,
): number {
  if (periods <= 0 || principal <= 0) return 0;
  if (rateMonthly <= 0) {
    return Math.round((principal / periods) * 100) / 100;
  }
  const factor = (1 + rateMonthly) ** periods;
  const pmt = (principal * rateMonthly * factor) / (factor - 1);
  return Math.round(pmt * 100) / 100;
}

/** Data da última parcela (início + N−1 meses). */
export function calculatePayoffDate(startsAt: Date, installments: number): Date {
  const offset = Math.max(installments - 1, 0);
  return addMonths(startsAt, offset);
}

/** Meses até quitar com pagamento mensal fixo (principal + juros). */
export function calculatePayoffMonths(
  principal: number,
  rateMonthly: number,
  payment: number,
): number {
  if (principal <= 0 || payment <= 0) return 0;
  let balance = principal;
  let months = 0;
  const maxMonths = 600;
  while (balance > 0.01 && months < maxMonths) {
    const interest = balance * rateMonthly;
    const principalPayment = payment - interest;
    if (principalPayment <= 0) return maxMonths;
    balance -= principalPayment;
    months += 1;
  }
  return months;
}

/** Data de quitação considerando parcela base + aporte extra mensal. */
export function calculatePayoffDateWithExtra(
  startsAt: Date,
  principal: number,
  rateMonthly: number,
  basePayment: number,
  extraPayment: number,
): Date {
  const months = calculatePayoffMonths(principal, rateMonthly, basePayment + extraPayment);
  return addMonths(startsAt, Math.max(months - 1, 0));
}
