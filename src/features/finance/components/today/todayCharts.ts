import { summarizeInvoices } from "@/features/finance/domain/card";
import { addDays, addMonths, daysInMonth, monthOf, parseDateStr, weekdayOf } from "@/features/finance/domain/dates";
import { dayMonth, monthShort } from "@/features/finance/domain/labels";
import { balancesByAccount, isMoneyAccount } from "@/features/finance/domain/ledger";
import { computeMonthPlan, type FinanceData, type MonthPlan } from "@/features/finance/domain/plan";
import type { Category, Cents, DateStr, MonthKey, Transaction } from "@/features/finance/domain/types";
import { institutionColor } from "@/features/finance/components/shared/InstitutionMark";
import { formatCents } from "@/lib/utils/format";

const FALLBACK = "#94a3b8";

export type CategorySlice = {
  key: string;
  label: string;
  color: string;
  icon: string | null;
  cents: Cents;
  pct: number;
};

/** Fatias do gasto por categoria (as maiores + "Outras"), a partir das linhas do plano. */
export function categorySlices(
  lines: { categoryId: string | null; cents: Cents }[],
  categories: Category[],
  limit = 6,
): CategorySlice[] {
  const positive = lines.filter((line) => line.cents > 0).sort((a, b) => b.cents - a.cents);
  const total = positive.reduce((sum, line) => sum + line.cents, 0);
  if (!total) return [];
  const byId = new Map(categories.map((category) => [category.id, category]));
  const head = positive.slice(0, limit);
  const rest = positive.slice(limit).reduce((sum, line) => sum + line.cents, 0);
  const slices = head.map((line) => {
    const category = line.categoryId ? byId.get(line.categoryId) : undefined;
    return {
      key: line.categoryId ?? "none",
      label: category?.name ?? "Sem categoria",
      color: category?.color ?? FALLBACK,
      icon: category?.icon ?? null,
      cents: line.cents,
      pct: (line.cents / total) * 100,
    };
  });
  if (rest > 0) slices.push({ key: "rest", label: "Outras", color: FALLBACK, icon: "circle-ellipsis", cents: rest, pct: (rest / total) * 100 });
  return slices;
}

/** Gasto por categoria numa janela de competências (fixas, parcelas e dia a dia, menos estornos). */
export function spendByCategory(transactions: Transaction[], from: MonthKey, to: MonthKey) {
  const totals = new Map<string | null, Cents>();
  for (const tx of transactions) {
    if (tx.competence < from || tx.competence > to) continue;
    if (tx.type !== "expense" && tx.type !== "refund") continue;
    const delta = tx.type === "expense" ? tx.amountCents : -tx.amountCents;
    totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + delta);
  }
  return [...totals.entries()].map(([categoryId, cents]) => ({ categoryId, cents }));
}

/** Quanto saiu em cada dia (data da compra), de qualquer conta, cartão incluso. */
function spendByDate(transactions: Transaction[], from: DateStr, to: DateStr) {
  const totals = new Map<DateStr, Cents>();
  for (const tx of transactions) {
    if (tx.date < from || tx.date > to) continue;
    if (tx.type === "expense") totals.set(tx.date, (totals.get(tx.date) ?? 0) + tx.amountCents);
    if (tx.type === "refund") totals.set(tx.date, (totals.get(tx.date) ?? 0) - tx.amountCents);
  }
  return totals;
}

export function monthHeat(data: FinanceData, month: MonthKey) {
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
  const totals = spendByDate(data.transactions, first, last);
  const max = Math.max(...totals.values(), 1);
  const days = Array.from({ length: daysInMonth(month) }, (_, index) => {
    const date = addDays(first, index);
    const cents = Math.max(totals.get(date) ?? 0, 0);
    return {
      date,
      day: index + 1,
      level: cents > 0 ? Math.max(cents / max, 0.08) : 0,
      label: `${dayMonth(date)} · ${cents > 0 ? formatCents(cents) : "sem gastos"}`,
      isToday: date === data.today,
      isFuture: date > data.today,
    };
  });
  const past = days.filter((day) => !day.isFuture);
  return {
    days,
    // Segunda = coluna 0.
    leadingBlanks: (weekdayOf(first) + 6) % 7,
    quietDays: past.filter((day) => day.level === 0).length,
    activeDays: past.filter((day) => day.level > 0).length,
  };
}

const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function weekSpend(data: FinanceData) {
  const monday = addDays(data.today, -((weekdayOf(data.today) + 6) % 7));
  const sunday = addDays(monday, 6);
  const totals = spendByDate(data.transactions, addDays(monday, -7), sunday);
  const bars = WEEK_LABELS.map((label, index) => {
    const date = addDays(monday, index);
    const cents = Math.max(totals.get(date) ?? 0, 0);
    return {
      label,
      value: cents,
      isToday: date === data.today,
      isFuture: date > data.today,
      title: `${dayMonth(date)} · ${formatCents(cents)}`,
    };
  });
  const thisWeek = bars.reduce((sum, bar) => sum + bar.value, 0);
  // Semana passada até o mesmo dia da semana: comparação justa no meio da semana.
  const elapsed = (weekdayOf(data.today) + 6) % 7;
  let lastWeek = 0;
  for (let index = 0; index <= elapsed; index += 1) lastWeek += Math.max(totals.get(addDays(monday, index - 7)) ?? 0, 0);
  return { bars, thisWeek, lastWeek };
}

/** Gasto do dia a dia acumulado dia a dia no mês (mesma regra do plano: sem fixas e parcelas). */
export function paceSeries(data: FinanceData, plan: MonthPlan) {
  const month = plan.month;
  const days = daysInMonth(month);
  const todayDay = month === monthOf(data.today) ? parseDateStr(data.today).day : days;
  const daily = new Array<Cents>(days).fill(0);
  for (const tx of data.transactions) {
    if (tx.competence !== month) continue;
    if (tx.type === "expense" && !tx.recurringId && !(tx.installment && tx.installment.count > 1)) {
      // Compra no cartão feita no fim do mês anterior conta no dia 1 desta fatura.
      const day = monthOf(tx.date) === month ? parseDateStr(tx.date).day : 1;
      daily[day - 1] += tx.amountCents;
    } else if (tx.type === "refund") {
      const day = monthOf(tx.date) === month ? parseDateStr(tx.date).day : 1;
      daily[day - 1] -= tx.amountCents;
    }
  }
  const cumulative: Cents[] = [];
  let running = 0;
  for (let index = 0; index < todayDay; index += 1) {
    running += daily[index];
    cumulative.push(Math.max(running, 0));
  }
  return { cumulative, days, budget: Math.max(plan.availableCents, 0) };
}

export function cashflow(data: FinanceData, count = 6) {
  const current = monthOf(data.today);
  return Array.from({ length: count }, (_, index) => {
    const month = addMonths(current, index - count + 1);
    const plan = computeMonthPlan(data, month);
    return {
      month,
      label: monthShort(month).replace(/\/\d+$/, ""),
      income: plan.income.receivedCents,
      spent: plan.fixed.paidCents + plan.installmentsCents + plan.variableCents,
      isCurrent: month === current,
    };
  });
}

export function moneySnapshot(data: FinanceData) {
  const balances = balancesByAccount(data.accounts, data.transactions);
  const money = data.accounts.filter((account) => !account.archived && isMoneyAccount(account));
  const rows = money
    .map((account) => ({ account, cents: balances.get(account.id) ?? 0 }))
    .sort((a, b) => b.cents - a.cents);
  const debt = data.accounts
    .filter((account) => !account.archived && account.kind === "credit_card")
    .reduce((sum, card) => sum + Math.min(balances.get(card.id) ?? 0, 0), 0);
  const total = rows.reduce((sum, row) => sum + row.cents, 0);
  // Cofres do mesmo banco ganham tons da marca para a barra continuar legível.
  const shades = new Map<string, number>();
  const parts = rows
    .filter((row) => row.cents > 0)
    .map((row) => {
      const index = shades.get(row.account.institution) ?? 0;
      shades.set(row.account.institution, index + 1);
      const base = institutionColor(row.account.institution);
      return {
        key: row.account.id,
        value: row.cents,
        color: index === 0 ? base : `color-mix(in oklch, ${base} ${100 - index * 25}%, white)`,
        label: `${row.account.name} · ${formatCents(row.cents)}`,
      };
    });
  return { rows, total, debt, parts, netWorth: total + debt };
}

/** Faturas a partir da aberta: o que já está comprometido em cada uma. */
export function upcomingInvoices(data: FinanceData, cardId: string, count = 6) {
  const card = data.accounts.find((account) => account.id === cardId);
  if (!card?.card) return [];
  return summarizeInvoices(card, data.transactions, data.today)
    .filter((invoice) => invoice.state === "open" || invoice.state === "future")
    .slice(0, count)
    .map((invoice) => ({ month: invoice.month, label: monthShort(invoice.month).replace(/\/\d+$/, ""), cents: invoice.totalCents, isOpen: invoice.state === "open" }));
}
