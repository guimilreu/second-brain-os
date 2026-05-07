import {
  addDays,
  addMonths,
  endOfMonth,
  isAfter,
  isBefore,
  isEqual,
  startOfDay,
} from "date-fns";

export type ForecastRecurringRule = {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  cadence: "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  startsAt: string | Date;
  endsAt?: string | Date;
  isActive: boolean;
  allocationPercent?: number;
  savingsPotId?: string;
};

export type ForecastTransaction = {
  amount: number;
  type: "income" | "expense";
  status: "planned" | "confirmed" | "late" | "cancelled";
  occurredAt: string | Date;
  recurringRuleId?: string;
  recurringOccurrenceDate?: string | Date;
};

export type ForecastOccurrence = {
  ruleId: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: Date;
  allocationAmount: number;
  savingsPotId?: string;
  status: "expected" | "late";
};

export type FinanceForecast = {
  expectedIncome: number;
  expectedExpenses: number;
  confirmedIncome: number;
  confirmedExpenses: number;
  plannedIncome: number;
  plannedExpenses: number;
  lateIncome: number;
  lateExpenses: number;
  projectedNet: number;
  freeToSpend: number;
  allocationAmount: number;
  allocationsByPot: Record<string, number>;
  occurrences: ForecastOccurrence[];
};

function isWithinRange(date: Date, start: Date, end: Date) {
  return (
    (isAfter(date, start) || isEqual(date, start)) &&
    (isBefore(date, end) || isEqual(date, end))
  );
}

/** Chave yyyy-mm-dd no calendário local (datas geradas pela regra recorrente). */
function calendarDateKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Dia civil armazenado na transação (prefixo yyyy-mm-dd de ISO ou calendário local).
 * Evita `isSameDay` com instantes UTC, que mudam de dia conforme o fuso.
 */
function recurringOccurrenceCalendarKey(raw: string | Date): string {
  if (typeof raw === "string") {
    const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
    if (isoDate) {
      return isoDate[1];
    }
  }
  return calendarDateKeyLocal(new Date(raw));
}

function clampDayOfMonth(year: number, month: number, day: number) {
  const monthEnd = endOfMonth(new Date(year, month, 1));
  return Math.min(day, monthEnd.getDate());
}

export function generateRecurringOccurrences(
  rules: ForecastRecurringRule[],
  startDate: Date,
  endDate: Date,
  asOfDate: Date = new Date(),
) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const today = startOfDay(asOfDate);
  const occurrences: ForecastOccurrence[] = [];

  for (const rule of rules) {
    if (!rule.isActive) {
      continue;
    }

    const ruleStart = startOfDay(new Date(rule.startsAt));
    const ruleEnd = rule.endsAt ? startOfDay(new Date(rule.endsAt)) : end;
    const effectiveStart = isAfter(ruleStart, start) ? ruleStart : start;
    const effectiveEnd = isBefore(ruleEnd, end) ? ruleEnd : end;

    if (isAfter(effectiveStart, effectiveEnd)) {
      continue;
    }

    if (rule.cadence === "weekly" && rule.dayOfWeek !== undefined) {
      let cursor = effectiveStart;

      while (cursor.getDay() !== rule.dayOfWeek) {
        cursor = addDays(cursor, 1);
      }

      while (isWithinRange(cursor, effectiveStart, effectiveEnd)) {
        occurrences.push({
          ruleId: rule.id,
          title: rule.title,
          amount: rule.amount,
          type: rule.type,
          category: rule.category,
          date: cursor,
          allocationAmount: rule.amount * ((rule.allocationPercent ?? 0) / 100),
          savingsPotId: rule.savingsPotId,
          status: isBefore(cursor, today) ? "late" : "expected",
        });
        cursor = addDays(cursor, 7);
      }
    }

    if (rule.cadence === "monthly" && rule.dayOfMonth !== undefined) {
      let cursor = new Date(
        effectiveStart.getFullYear(),
        effectiveStart.getMonth(),
        clampDayOfMonth(
          effectiveStart.getFullYear(),
          effectiveStart.getMonth(),
          rule.dayOfMonth,
        ),
      );

      if (isBefore(cursor, effectiveStart)) {
        const nextMonth = addMonths(cursor, 1);
        cursor = new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          clampDayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth(), rule.dayOfMonth),
        );
      }

      while (isWithinRange(cursor, effectiveStart, effectiveEnd)) {
        occurrences.push({
          ruleId: rule.id,
          title: rule.title,
          amount: rule.amount,
          type: rule.type,
          category: rule.category,
          date: cursor,
          allocationAmount: rule.amount * ((rule.allocationPercent ?? 0) / 100),
          savingsPotId: rule.savingsPotId,
          status: isBefore(cursor, today) ? "late" : "expected",
        });

        const nextMonth = addMonths(cursor, 1);
        cursor = new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          clampDayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth(), rule.dayOfMonth),
        );
      }
    }
  }

  return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function calculateFinanceForecast(
  transactions: ForecastTransaction[],
  rules: ForecastRecurringRule[],
  startDate: Date,
  endDate: Date,
  asOfDate: Date = new Date(),
): FinanceForecast {
  const activeTransactions = transactions.filter(
    (transaction) =>
      transaction.status !== "cancelled" &&
      isWithinRange(startOfDay(new Date(transaction.occurredAt)), startDate, endDate),
  );
  const occurrenceTransactions = activeTransactions.filter(
    (transaction) => transaction.recurringRuleId && transaction.recurringOccurrenceDate,
  );
  const occurrences = generateRecurringOccurrences(rules, startDate, endDate, asOfDate).filter(
    (occurrence) =>
      !occurrenceTransactions.some(
        (transaction) =>
          transaction.recurringRuleId === occurrence.ruleId &&
          transaction.recurringOccurrenceDate &&
          recurringOccurrenceCalendarKey(transaction.recurringOccurrenceDate) ===
            calendarDateKeyLocal(occurrence.date),
      ),
  );

  const confirmedIncome = activeTransactions
    .filter((transaction) => transaction.type === "income" && transaction.status === "confirmed")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const confirmedExpenses = activeTransactions
    .filter((transaction) => transaction.type === "expense" && transaction.status === "confirmed")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const plannedIncome = activeTransactions
    .filter((transaction) => transaction.type === "income" && transaction.status === "planned")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const plannedExpenses = activeTransactions
    .filter((transaction) => transaction.type === "expense" && transaction.status === "planned")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const lateIncome = activeTransactions
    .filter((transaction) => transaction.type === "income" && transaction.status === "late")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const lateExpenses = activeTransactions
    .filter((transaction) => transaction.type === "expense" && transaction.status === "late")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const expectedIncome = occurrences
    .filter((occurrence) => occurrence.type === "income")
    .reduce((total, occurrence) => total + occurrence.amount, 0);

  const expectedExpenses = occurrences
    .filter((occurrence) => occurrence.type === "expense")
    .reduce((total, occurrence) => total + occurrence.amount, 0);

  const allocationAmount = occurrences.reduce(
    (total, occurrence) => total + occurrence.allocationAmount,
    0,
  );

  const allocationsByPot = occurrences.reduce<Record<string, number>>((acc, occurrence) => {
    if (!occurrence.savingsPotId || occurrence.allocationAmount <= 0) {
      return acc;
    }

    acc[occurrence.savingsPotId] =
      (acc[occurrence.savingsPotId] ?? 0) + occurrence.allocationAmount;
    return acc;
  }, {});

  const projectedNet =
    confirmedIncome +
    plannedIncome +
    lateIncome +
    expectedIncome -
    confirmedExpenses -
    plannedExpenses -
    lateExpenses -
    expectedExpenses;

  return {
    expectedIncome,
    expectedExpenses,
    confirmedIncome,
    confirmedExpenses,
    plannedIncome,
    plannedExpenses,
    lateIncome,
    lateExpenses,
    projectedNet,
    allocationAmount,
    allocationsByPot,
    freeToSpend: projectedNet - allocationAmount,
    occurrences,
  };
}
