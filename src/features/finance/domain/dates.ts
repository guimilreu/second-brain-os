import type { DateStr, MonthKey } from "./types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateStr(year: number, month: number, day: number): DateStr {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDateStr(date: DateStr) {
  const [y, m, d] = date.split("-").map(Number);
  return { year: y, month: m, day: d };
}

export function isMonthKey(value: string): value is MonthKey {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Data real (rejeita 2026-02-30). */
export function isDateStr(value: string): value is DateStr {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !isMonthKey(value.slice(0, 7))) return false;
  const day = Number(value.slice(8));
  return day >= 1 && day <= daysInMonth(value.slice(0, 7));
}

/** "Hoje" no fuso do usuário — o servidor pode estar em UTC. */
export function todayInTimezone(timezone: string, now: Date = new Date()): DateStr {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthOf(date: DateStr): MonthKey {
  return date.slice(0, 7);
}

export function addMonths(month: MonthKey, count: number): MonthKey {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + count;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

export function monthDiff(from: MonthKey, to: MonthKey): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return ty * 12 + tm - (fy * 12 + fm);
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Dia `day` do mês, limitado ao último dia (dia 31 em fevereiro vira 28/29). */
export function dayInMonth(month: MonthKey, day: number): DateStr {
  const [y, m] = month.split("-").map(Number);
  return toDateStr(y, m, Math.min(Math.max(day, 1), daysInMonth(month)));
}

function toUtc(date: DateStr) {
  const { year, month, day } = parseDateStr(date);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date: DateStr, count: number): DateStr {
  const d = new Date(toUtc(date) + count * 86_400_000);
  return toDateStr(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Dias de `from` até `to` (positivo se `to` é depois). */
export function diffDays(from: DateStr, to: DateStr): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const months: MonthKey[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m);
  return months;
}

/** Dias restantes no mês contando hoje. */
export function daysLeftInMonth(today: DateStr): number {
  return daysInMonth(monthOf(today)) - parseDateStr(today).day + 1;
}

export function weekdayOf(date: DateStr): number {
  return new Date(toUtc(date)).getUTCDay();
}
