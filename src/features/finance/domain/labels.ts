import { parseDateStr } from "./dates";
import type { DateStr, MonthKey } from "./types";

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function monthName(month: MonthKey): string {
  return MONTHS[Number(month.slice(5)) - 1];
}

/** "outubro" no ano corrente, "outubro de 2027" fora dele. */
export function monthLabel(month: MonthKey, currentYear?: number): string {
  const year = Number(month.slice(0, 4));
  return currentYear && year !== currentYear ? `${monthName(month)} de ${year}` : monthName(month);
}

export function monthShort(month: MonthKey): string {
  return `${MONTHS_SHORT[Number(month.slice(5)) - 1]}/${month.slice(2, 4)}`;
}

/** "05/nov" */
export function dayMonth(date: DateStr): string {
  const { month, day } = parseDateStr(date);
  return `${String(day).padStart(2, "0")}/${MONTHS_SHORT[month - 1]}`;
}

/** "qua, 05/nov" */
export function weekdayDayMonth(date: DateStr): string {
  const { year, month, day } = parseDateStr(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday].slice(0, 3)}, ${dayMonth(date)}`;
}

/** "Fatura de outubro" — o mês é o de fechamento, como o usuário chama. */
export function invoiceLabel(month: MonthKey, currentYear?: number): string {
  return `Fatura de ${monthLabel(month, currentYear)}`;
}

export function relativeDays(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  if (days > 1) return `em ${days} dias`;
  return `há ${-days} dias`;
}

export const METHOD_LABELS = {
  pix: "PIX",
  debit: "Débito",
  credit: "Crédito",
  cash: "Dinheiro",
  boleto: "Boleto",
  transfer: "Transferência",
} as const;

export const INSTITUTION_LABELS = {
  mercadopago: "Mercado Pago",
  nubank: "Nubank",
  inter: "Inter",
  other: "Outra",
} as const;

export const KIND_LABELS = {
  checking: "Conta",
  pocket: "Cofrinho",
  credit_card: "Cartão de crédito",
  cash: "Dinheiro",
} as const;

export const PURPOSE_LABELS = {
  operating: "Dia a dia",
  card_reserve: "Reserva da fatura",
  goal: "Meta",
  savings: "Reserva",
} as const;
