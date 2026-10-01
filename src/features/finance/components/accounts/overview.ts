import {
  cardReserveNeededCents,
  cardUsedLimitCents,
  summarizeInvoices,
  type InvoiceState,
} from "@/features/finance/domain/card";
import { monthDiff, monthOf } from "@/features/finance/domain/dates";
import { balancesByAccount } from "@/features/finance/domain/ledger";
import type { FinanceData } from "@/features/finance/domain/plan";
import {
  INSTITUTIONS,
  type Account,
  type Cents,
  type DateStr,
  type GoalConfig,
  type Institution,
  type MonthKey,
} from "@/features/finance/domain/types";
import { estimatedMonthlyYieldCents } from "@/features/finance/domain/yield";

export type GoalProgress = {
  savedCents: Cents;
  targetCents: Cents;
  percent: number;
  reached: boolean;
  /** Definido pelo usuário ou, sem isso, calculado para chegar até a data. */
  monthlyCents: Cents | null;
  monthlySuggested: boolean;
  targetMonth: MonthKey | null;
  /** Passou da data sem chegar ao alvo. */
  late: boolean;
};

export type CardStatus = {
  /** Fatura aberta + fechadas não pagas: o que o cofre da fatura precisa cobrir hoje. */
  currentDebtCents: Cents;
  /** Tudo que falta pagar, inclusive parcelas futuras. */
  totalDebtCents: Cents;
  freeLimitCents: Cents | null;
  /** Fatura fechada mais antiga em aberto; sem ela, a aberta (se tiver valor). */
  nextPayment: { month: MonthKey; dueDate: DateStr; remainingCents: Cents; state: InvoiceState } | null;
  openInvoice: { month: MonthKey; closingDate: DateStr; dueDate: DateStr } | null;
};

export type ReserveStatus = {
  cards: { id: string; name: string }[];
  neededCents: Cents;
  missingCents: Cents;
};

export type AccountItem = {
  account: Account;
  balanceCents: Cents;
  monthlyYieldCents: Cents;
  goal: GoalProgress | null;
  reserve: ReserveStatus | null;
  card: CardStatus | null;
};

export type InstitutionGroup = {
  institution: Institution;
  /** Soma do dinheiro em contas e cofres (cartões ficam de fora). */
  totalCents: Cents;
  hasMoney: boolean;
  items: AccountItem[];
};

export type AccountsOverview = {
  today: DateStr;
  /** Rendimento já lançado por conta, no mês atual e no anterior (evita lançar duas vezes). */
  yieldsRecorded: Record<MonthKey, Record<string, Cents>>;
  cdiAnnualPct: number | null;
  operatingId: string | null;
  groups: InstitutionGroup[];
  archived: AccountItem[];
  stats: {
    netWorthCents: Cents;
    cardDebtCents: Cents;
    availableCents: Cents;
    savedCents: Cents;
    cardReserveCents: Cents;
    monthlyYieldCents: Cents;
    /** Rendimento lançado (categoria Rendimentos) no mês atual e nos últimos 12 meses. */
    yieldThisMonthCents: Cents;
    yieldLast12Cents: Cents;
  };
};

const SAVED_PURPOSES = new Set<Account["purpose"]>(["goal", "savings", "card_reserve"]);

/**
 * Quanto guardar por mês para chegar ao alvo até o mês da data (o mês atual conta, como no plano),
 * arredondado para cima no real.
 */
export function goalMonthlySuggestion(remainingCents: Cents, today: DateStr, targetDate: DateStr | null): Cents | null {
  if (!targetDate || remainingCents <= 0) return null;
  const months = Math.max(monthDiff(monthOf(today), monthOf(targetDate)) + 1, 1);
  return Math.ceil(remainingCents / months / 100) * 100;
}

function goalProgress(goal: GoalConfig, savedCents: Cents, today: DateStr): GoalProgress {
  const reached = savedCents >= goal.targetCents;
  const suggested = goal.monthlyCents
    ? null
    : goalMonthlySuggestion(goal.targetCents - savedCents, today, goal.targetDate);
  return {
    savedCents,
    targetCents: goal.targetCents,
    percent: goal.targetCents > 0 ? (savedCents / goal.targetCents) * 100 : 0,
    reached,
    monthlyCents: goal.monthlyCents || suggested,
    monthlySuggested: !goal.monthlyCents && suggested !== null,
    targetMonth: goal.targetDate ? monthOf(goal.targetDate) : null,
    late: Boolean(goal.targetDate && goal.targetDate < today && !reached),
  };
}

function cardStatus(card: Account, data: FinanceData): CardStatus | null {
  if (!card.card) return null;
  const invoices = summarizeInvoices(card, data.transactions, data.today);
  const totalDebtCents = cardUsedLimitCents(invoices);
  const due =
    invoices.find((invoice) => (invoice.state === "closed" || invoice.state === "overdue") && invoice.remainingCents > 0) ??
    invoices.find((invoice) => invoice.state === "open" && invoice.remainingCents > 0);
  const open = invoices.find((invoice) => invoice.state === "open");
  return {
    currentDebtCents: cardReserveNeededCents(invoices),
    totalDebtCents,
    freeLimitCents: card.card.limitCents === null ? null : card.card.limitCents - totalDebtCents,
    nextPayment: due
      ? { month: due.month, dueDate: due.dueDate, remainingCents: due.remainingCents, state: due.state }
      : null,
    openInvoice: open ? { month: open.month, closingDate: open.closingDate, dueDate: open.dueDate } : null,
  };
}

/** Tudo que a tela de contas mostra, calculado no servidor (objetos simples, serializáveis). */
export function buildAccountsOverview(data: FinanceData, cdiAnnualPct: number | null): AccountsOverview {
  const { accounts, today } = data;
  const balances = balancesByAccount(accounts, data.transactions);
  const cards = new Map<string, CardStatus>();
  for (const account of accounts) {
    const status = cardStatus(account, data);
    if (status) cards.set(account.id, status);
  }

  const toItem = (account: Account): AccountItem => {
    const balanceCents = balances.get(account.id) ?? 0;
    let reserve: ReserveStatus | null = null;
    if (account.purpose === "card_reserve") {
      const served = accounts.filter((card) => !card.archived && card.card?.reserveAccountId === account.id);
      const neededCents = served.reduce((total, card) => total + (cards.get(card.id)?.currentDebtCents ?? 0), 0);
      reserve = {
        cards: served.map((card) => ({ id: card.id, name: card.name })),
        neededCents,
        missingCents: Math.max(neededCents - balanceCents, 0),
      };
    }
    return {
      account,
      balanceCents,
      monthlyYieldCents:
        account.kind === "credit_card" ? 0 : estimatedMonthlyYieldCents(balanceCents, cdiAnnualPct, account.yieldCdiPct),
      goal: account.purpose === "goal" && account.goal ? goalProgress(account.goal, balanceCents, today) : null,
      reserve,
      card: cards.get(account.id) ?? null,
    };
  };

  const active = accounts.filter((account) => !account.archived).map(toItem);
  const stats = {
    netWorthCents: 0,
    cardDebtCents: 0,
    availableCents: 0,
    savedCents: 0,
    cardReserveCents: 0,
    monthlyYieldCents: 0,
    yieldThisMonthCents: 0,
    yieldLast12Cents: 0,
  };
  const yieldCategoryIds = new Set(
    data.categories.filter((category) => category.systemKey === "yield").map((category) => category.id),
  );
  const currentMonth = monthOf(today);
  const yieldsRecorded: Record<MonthKey, Record<string, Cents>> = {};
  for (const tx of data.transactions) {
    if (tx.type !== "income" || !tx.categoryId || !yieldCategoryIds.has(tx.categoryId)) continue;
    if (monthDiff(tx.competence, currentMonth) <= 1) {
      const byAccount = (yieldsRecorded[tx.competence] ??= {});
      byAccount[tx.accountId] = (byAccount[tx.accountId] ?? 0) + tx.amountCents;
    }
    const age = monthDiff(tx.competence, currentMonth);
    if (age === 0) stats.yieldThisMonthCents += tx.amountCents;
    if (age >= 0 && age < 12) stats.yieldLast12Cents += tx.amountCents;
  }
  for (const item of active) {
    if (item.account.kind === "credit_card") {
      stats.cardDebtCents += item.card?.totalDebtCents ?? 0;
      continue;
    }
    if (SAVED_PURPOSES.has(item.account.purpose)) stats.savedCents += item.balanceCents;
    else stats.availableCents += item.balanceCents;
    if (item.account.purpose === "card_reserve") stats.cardReserveCents += item.balanceCents;
    stats.monthlyYieldCents += item.monthlyYieldCents;
  }
  stats.netWorthCents = stats.availableCents + stats.savedCents - stats.cardDebtCents;

  const groups = INSTITUTIONS.map((institution) => {
    const items = active.filter((item) => item.account.institution === institution);
    const money = items.filter((item) => item.account.kind !== "credit_card");
    return {
      institution,
      items,
      hasMoney: money.length > 0,
      totalCents: money.reduce((total, item) => total + item.balanceCents, 0),
    };
  }).filter((group) => group.items.length > 0);

  return {
    today,
    yieldsRecorded,
    cdiAnnualPct,
    operatingId: accounts.find((account) => !account.archived && account.purpose === "operating")?.id ?? null,
    groups,
    archived: accounts.filter((account) => account.archived).map(toItem),
    stats,
  };
}
