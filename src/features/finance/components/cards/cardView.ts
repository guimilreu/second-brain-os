import {
  cardReserveNeededCents,
  cardUsedLimitCents,
  invoiceDates,
  invoiceMonthFor,
  invoiceState,
  isSettledOutside,
  summarizeInvoices,
  type InvoiceState,
  type InvoiceSummary,
} from "@/features/finance/domain/card";
import { addDays, addMonths } from "@/features/finance/domain/dates";
import { invoiceLabel } from "@/features/finance/domain/labels";
import { balancesByAccount } from "@/features/finance/domain/ledger";
import { sumCents } from "@/features/finance/domain/money";
import type { FinanceData } from "@/features/finance/domain/plan";
import { occurrencesForCompetence, type Occurrence } from "@/features/finance/domain/recurring";
import type { Account, CardConfig, Cents, DateStr, MonthKey, Transaction } from "@/features/finance/domain/types";
import type { EntryDraft } from "@/stores/entry-store";
import { inAccount, RESERVE_MIN_GAP } from "./cardLabels";

/** Faturas do gráfico "Já comprometido", a partir da aberta. */
const COMMITMENT_HORIZON = 12;
/** Faturas futuras na linha do tempo; o gráfico cobre o resto. */
const TIMELINE_FUTURE = 6;
/** Faturas pagas que continuam na linha do tempo (meses antes da aberta). */
const TIMELINE_PAID_MONTHS = 6;

export type CardAccount = Account & { card: CardConfig };

export function isCardAccount(account: Account): account is CardAccount {
  return account.card !== null;
}

export type InvoiceBreakdown = {
  /** Parcelas já lançadas. */
  installmentsCents: Cents;
  /** Fixas já lançadas. */
  fixedCents: Cents;
  /** Fixas previstas ainda não lançadas (só fatura aberta e futuras). */
  predictedCents: Cents;
  /** Compras à vista e ajustes, menos estornos. */
  otherCents: Cents;
};

export type InvoiceView = InvoiceSummary & {
  breakdown: InvoiceBreakdown;
  /** O que deve fechar: o lançado mais as fixas previstas. */
  forecastCents: Cents;
  /** Compras de periodStart a periodEnd caem nesta fatura. */
  periodStart: DateStr;
  periodEnd: DateStr;
  lastPaymentDate: DateStr | null;
};

export type InvoiceItems = {
  purchases: Transaction[];
  installments: Transaction[];
  fixed: Transaction[];
  /** Fixas do cartão que ainda vão cair nesta fatura. */
  predicted: Occurrence[];
  adjustments: Transaction[];
  payments: Transaction[];
};

export type CategoryShare = { categoryId: string | null; cents: Cents };

export type CommitmentMonth = {
  month: MonthKey;
  dueDate: DateStr;
  installmentsCents: Cents;
  /** Fixas lançadas + previstas. */
  fixedCents: Cents;
  otherCents: Cents;
  totalCents: Cents;
};

export type InstallmentPlan = {
  groupId: string;
  description: string;
  categoryId: string | null;
  count: number;
  /** Primeira parcela ainda não paga (na fatura aberta ou depois). */
  nextIndex: number;
  nextMonth: MonthKey;
  installmentCents: Cents;
  remainingCount: number;
  remainingCents: Cents;
  endMonth: MonthKey;
};

export type ReservePart = { month: MonthKey; state: InvoiceState; remainingCents: Cents };

export type ReserveStatus = {
  /** Cofre ligado ao cartão; null quando não foi configurado. */
  account: Account | null;
  balanceCents: Cents;
  /** Fechadas em aberto + aberta: o que precisa estar guardado hoje. */
  neededCents: Cents;
  parts: ReservePart[];
};

export type CardScreen = {
  today: DateStr;
  currentYear: number;
  openMonth: MonthKey;
  timeline: InvoiceView[];
  selected: InvoiceView;
  items: InvoiceItems;
  categories: CategoryShare[];
  commitments: CommitmentMonth[];
  plans: InstallmentPlan[];
  reserve: ReserveStatus;
  limit: { limitCents: Cents; usedCents: Cents } | null;
  /** Nenhuma compra lançada ainda: a tela convida a lançar o histórico do cartão. */
  isEmpty: boolean;
  /** "Já estava paga antes do app" na fatura escolhida: marcar (até ela) ou desfazer. */
  settle: { canMark: boolean; canUndo: boolean };
  drafts: {
    /** "Pagar fatura" do topo: a fechada mais antiga em aberto. */
    payDue: EntryDraft | null;
    /** Pagar a fatura selecionada, se fechada ou atrasada. */
    paySelected: EntryDraft | null;
    /** Guardar no cofre o que falta para as faturas em aberto. */
    reserve: EntryDraft | null;
  };
};

type ItemKind = "purchase" | "installment" | "fixed" | "adjustment";

function itemKind(tx: Transaction, systemCategoryIds: Set<string>): ItemKind {
  if (tx.type === "refund") return "adjustment";
  // "Ajuste da fatura" usa categoria do sistema.
  if (tx.categoryId && systemCategoryIds.has(tx.categoryId)) return "adjustment";
  if (tx.recurringId) return "fixed";
  if (tx.installment && tx.installment.count > 1) return "installment";
  return "purchase";
}

/** Quanto o lançamento soma na fatura (estorno abate). */
function chargeCents(tx: Transaction): Cents {
  return tx.type === "refund" ? -tx.amountCents : tx.amountCents;
}

function byDateDesc<T extends { date: DateStr }>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function emptySummary(card: CardAccount, month: MonthKey, today: DateStr): InvoiceSummary {
  const settledOutside = isSettledOutside(card.card, month);
  return {
    cardId: card.id,
    month,
    ...invoiceDates(card.card, month),
    chargesCents: 0,
    creditsCents: 0,
    totalCents: 0,
    paidCents: 0,
    remainingCents: 0,
    state: settledOutside ? "paid" : invoiceState(card.card, month, today, 0),
    itemCount: 0,
    settledOutside,
  };
}

/** Tudo que a tela do cartão mostra, calculado no servidor a partir do domínio. */
export function buildCardScreen(data: FinanceData, card: CardAccount, requestedMonth: MonthKey | null): CardScreen {
  const { today } = data;
  const config = card.card;
  const currentYear = Number(today.slice(0, 4));
  const openMonth = invoiceMonthFor(config, today);
  const summaries = summarizeInvoices(card, data.transactions, today);
  const systemCategoryIds = new Set(
    data.categories.filter((category) => category.systemKey).map((category) => category.id),
  );
  const recurrings = data.recurrings.filter((item) => item.accountId === card.id && item.type === "expense");

  const chargesByMonth = new Map<MonthKey, Transaction[]>();
  const paymentsByMonth = new Map<MonthKey, Transaction[]>();
  for (const tx of data.transactions) {
    if (!tx.invoiceMonth) continue;
    if (tx.accountId === card.id && (tx.type === "expense" || tx.type === "refund")) {
      pushTo(chargesByMonth, tx.invoiceMonth, tx);
    } else if (tx.type === "transfer" && tx.toAccountId === card.id) {
      pushTo(paymentsByMonth, tx.invoiceMonth, tx);
    }
  }

  const predictedCache = new Map<MonthKey, Occurrence[]>();
  const predictedFor = (month: MonthKey): Occurrence[] => {
    const cached = predictedCache.get(month);
    if (cached) return cached;
    // Fatura fechada já tem o valor do banco: previsão só para a aberta e as futuras.
    const list =
      month < openMonth
        ? []
        : occurrencesForCompetence(recurrings, data.accounts, data.transactions, month).filter((item) => !item.posted);
    predictedCache.set(month, list);
    return list;
  };

  const viewCache = new Map<MonthKey, InvoiceView>();
  const viewFor = (month: MonthKey): InvoiceView => {
    const cached = viewCache.get(month);
    if (cached) return cached;
    const summary = summaries.find((item) => item.month === month) ?? emptySummary(card, month, today);
    const breakdown: InvoiceBreakdown = { installmentsCents: 0, fixedCents: 0, predictedCents: 0, otherCents: 0 };
    for (const tx of chargesByMonth.get(month) ?? []) {
      const kind = itemKind(tx, systemCategoryIds);
      if (kind === "installment") breakdown.installmentsCents += chargeCents(tx);
      else if (kind === "fixed") breakdown.fixedCents += chargeCents(tx);
      else breakdown.otherCents += chargeCents(tx);
    }
    breakdown.predictedCents = sumCents(predictedFor(month).map((item) => item.amountCents));
    const view: InvoiceView = {
      ...summary,
      breakdown,
      forecastCents: summary.totalCents + breakdown.predictedCents,
      periodStart: invoiceDates(config, addMonths(month, -1)).closingDate,
      periodEnd: addDays(summary.closingDate, -1),
      lastPaymentDate: (paymentsByMonth.get(month) ?? []).reduce<DateStr | null>(
        (latest, tx) => (latest && latest >= tx.date ? latest : tx.date),
        null,
      ),
    };
    viewCache.set(month, view);
    return view;
  };

  const dueSummary = summaries.find((item) => item.state === "closed" || item.state === "overdue") ?? null;
  const selected = viewFor(requestedMonth ?? dueSummary?.month ?? openMonth);

  const timelineMonths = new Set<MonthKey>([openMonth, selected.month]);
  const paidFrom = addMonths(openMonth, -TIMELINE_PAID_MONTHS);
  for (const summary of summaries) {
    if (summary.month >= openMonth) continue;
    const unpaid = summary.state === "closed" || summary.state === "overdue";
    const hasActivity = summary.itemCount > 0 || summary.paidCents > 0;
    if (unpaid || (hasActivity && summary.month >= paidFrom)) timelineMonths.add(summary.month);
  }
  for (let offset = 1; offset <= TIMELINE_FUTURE; offset += 1) {
    const view = viewFor(addMonths(openMonth, offset));
    if (view.itemCount > 0 || view.forecastCents !== 0) timelineMonths.add(view.month);
  }

  const items: InvoiceItems = {
    purchases: [],
    installments: [],
    fixed: [],
    predicted: predictedFor(selected.month),
    adjustments: [],
    payments: byDateDesc(paymentsByMonth.get(selected.month) ?? []),
  };
  const categoryTotals = new Map<string | null, Cents>();
  const addToCategory = (categoryId: string | null, cents: Cents) =>
    categoryTotals.set(categoryId, (categoryTotals.get(categoryId) ?? 0) + cents);
  for (const tx of byDateDesc(chargesByMonth.get(selected.month) ?? [])) {
    const kind = itemKind(tx, systemCategoryIds);
    if (kind === "purchase") items.purchases.push(tx);
    else if (kind === "installment") items.installments.push(tx);
    else if (kind === "fixed") items.fixed.push(tx);
    else items.adjustments.push(tx);
    addToCategory(tx.categoryId, chargeCents(tx));
  }
  for (const occurrence of items.predicted) addToCategory(occurrence.recurring.categoryId, occurrence.amountCents);

  const commitments = Array.from({ length: COMMITMENT_HORIZON }, (_, offset): CommitmentMonth => {
    const view = viewFor(addMonths(openMonth, offset));
    return {
      month: view.month,
      dueDate: view.dueDate,
      installmentsCents: Math.max(view.breakdown.installmentsCents, 0),
      fixedCents: Math.max(view.breakdown.fixedCents + view.breakdown.predictedCents, 0),
      otherCents: Math.max(view.breakdown.otherCents, 0),
      totalCents: view.forecastCents,
    };
  });

  const groups = new Map<string, Transaction[]>();
  for (const list of chargesByMonth.values()) {
    for (const tx of list) {
      if (tx.type === "expense" && tx.installment && tx.installment.count > 1) pushTo(groups, tx.installment.groupId, tx);
    }
  }
  const plans: InstallmentPlan[] = [];
  for (const [groupId, list] of groups) {
    const remaining = list
      .filter((tx) => tx.invoiceMonth !== null && tx.invoiceMonth >= openMonth)
      .sort((a, b) => (a.installment?.index ?? 0) - (b.installment?.index ?? 0));
    const next = remaining[0];
    if (!next?.installment || !next.invoiceMonth) continue;
    plans.push({
      groupId,
      description: next.description,
      categoryId: next.categoryId,
      count: next.installment.count,
      nextIndex: next.installment.index,
      nextMonth: next.invoiceMonth,
      installmentCents: next.amountCents,
      remainingCount: remaining.length,
      remainingCents: sumCents(remaining.map((tx) => tx.amountCents)),
      endMonth: list.reduce(
        (last, tx) => (tx.invoiceMonth && tx.invoiceMonth > last ? tx.invoiceMonth : last),
        next.invoiceMonth,
      ),
    });
  }
  plans.sort((a, b) =>
    a.endMonth === b.endMonth ? a.description.localeCompare(b.description, "pt-BR") : a.endMonth < b.endMonth ? -1 : 1,
  );

  const reserveAccount = config.reserveAccountId
    ? (data.accounts.find((account) => account.id === config.reserveAccountId) ?? null)
    : null;
  const reserve: ReserveStatus = {
    account: reserveAccount,
    balanceCents: reserveAccount ? (balancesByAccount(data.accounts, data.transactions).get(reserveAccount.id) ?? 0) : 0,
    neededCents: cardReserveNeededCents(summaries),
    parts: summaries
      .filter(
        (item) =>
          (item.state === "open" || item.state === "closed" || item.state === "overdue") && item.remainingCents > 0,
      )
      .map((item) => ({ month: item.month, state: item.state, remainingCents: item.remainingCents })),
  };

  const operating = data.accounts.find((account) => account.purpose === "operating" && !account.archived) ?? null;
  const payDraft = (invoice: InvoiceView): EntryDraft => ({
    type: "transfer",
    accountId: reserveAccount?.id ?? operating?.id,
    toAccountId: card.id,
    amountCents: invoice.remainingCents,
    invoiceMonth: invoice.month,
    description: `Pagamento da ${invoiceLabel(invoice.month, currentYear).toLowerCase()}`,
    title: `Pagar ${invoiceLabel(invoice.month, currentYear)}`,
  });
  const reserveGap = reserve.neededCents - reserve.balanceCents;

  return {
    today,
    currentYear,
    openMonth,
    timeline: [...timelineMonths].sort().map(viewFor),
    selected,
    items,
    categories: [...categoryTotals.entries()]
      .filter(([, cents]) => cents > 0)
      .map(([categoryId, cents]) => ({ categoryId, cents }))
      .sort((a, b) => b.cents - a.cents),
    commitments,
    plans,
    reserve,
    limit: config.limitCents ? { limitCents: config.limitCents, usedCents: cardUsedLimitCents(summaries) } : null,
    isEmpty: chargesByMonth.size === 0,
    settle: {
      // Só fatura que fechou antes de o cartão entrar no app pode ter sido paga fora dele.
      canMark:
        (selected.state === "closed" || selected.state === "overdue") && selected.closingDate <= card.openingDate,
      canUndo: selected.settledOutside && selected.month === config.settledThroughMonth,
    },
    drafts: {
      payDue: dueSummary ? payDraft(viewFor(dueSummary.month)) : null,
      paySelected:
        (selected.state === "closed" || selected.state === "overdue") && selected.remainingCents > 0
          ? payDraft(selected)
          : null,
      reserve:
        reserveAccount && reserveGap >= RESERVE_MIN_GAP
          ? {
              type: "transfer",
              accountId: operating?.id,
              toAccountId: reserveAccount.id,
              amountCents: reserveGap,
              description: "Reserva da fatura",
              title: `Guardar ${inAccount(reserveAccount)}`,
            }
          : null,
    },
  };
}

export type CardListItem = {
  card: CardAccount;
  open: InvoiceSummary;
  /** Fechada mais antiga ainda não paga. */
  due: InvoiceSummary | null;
};

export function buildCardListItem(data: FinanceData, card: CardAccount): CardListItem {
  const invoices = summarizeInvoices(card, data.transactions, data.today);
  const openMonth = invoiceMonthFor(card.card, data.today);
  return {
    card,
    open: invoices.find((item) => item.month === openMonth) ?? emptySummary(card, openMonth, data.today),
    due: invoices.find((item) => item.state === "closed" || item.state === "overdue") ?? null,
  };
}
