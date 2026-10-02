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

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function easterSunday(year: number): DateStr {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((8 * b + 13) / 25)) / 3) + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toDateStr(year, month, day);
}

const FIXED_BANK_HOLIDAYS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

/** Feriado bancário nacional (calendário da FEBRABAN): fixos + Carnaval, Sexta-feira da Paixão e Corpus Christi. */
export function isBankHoliday(date: DateStr): boolean {
  if (FIXED_BANK_HOLIDAYS.includes(date.slice(5))) return true;
  const easter = easterSunday(parseDateStr(date).year);
  return [-48, -47, -2, 60].some((offset) => addDays(easter, offset) === date);
}

/** A própria data se for dia útil bancário; senão, o próximo (vencimento que cai no fim de semana ou feriado). */
export function nextBusinessDay(date: DateStr): DateStr {
  let day = date;
  while (weekdayOf(day) === 0 || weekdayOf(day) === 6 || isBankHoliday(day)) day = addDays(day, 1);
  return day;
}
