import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatShortDate(date: Date | string) {
  return format(new Date(date), "dd MMM", { locale: ptBR });
}

export function formatWeekRange(startsAt: Date | string, endsAt: Date | string) {
  return `${formatShortDate(startsAt)} - ${formatShortDate(endsAt)}`;
}
