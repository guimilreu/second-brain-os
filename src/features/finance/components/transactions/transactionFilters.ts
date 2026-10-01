import { isMonthKey, monthOf } from "@/features/finance/domain/dates";
import { parseMoneyInput } from "@/features/finance/domain/money";
import type { Account, Category, Cents, DateStr, MonthKey, Transaction } from "@/features/finance/domain/types";

export type TypeFilter = "expense" | "income" | "transfer";

export type TransactionFilters = {
  /** Competência ("all" = todos os meses). */
  month: MonthKey | "all";
  /** "expense" inclui estornos: é o que forma as saídas do período. */
  type: TypeFilter | null;
  account: string | null;
  /** Id da categoria ou "none" (sem categoria). */
  category: string | null;
  q: string;
  /** Compra parcelada (installment.groupId): lista todas as parcelas, de qualquer mês. */
  group: string | null;
  limit: number;
};

export const PAGE_SIZE = 300;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** isMonthKey só confere o formato; "2026-13" quebraria os rótulos do mês. */
function isValidMonth(value: string | undefined): value is MonthKey {
  if (!value || !isMonthKey(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

export function parseTransactionFilters(
  params: RawParams,
  context: { today: DateStr; accounts: Account[]; categories: Category[] },
): TransactionFilters {
  const month = first(params.month);
  const type = first(params.type);
  const account = first(params.account);
  const category = first(params.category);
  const limit = Number(first(params.limit));
  return {
    month: month === "all" ? "all" : isValidMonth(month) ? month : monthOf(context.today),
    type: type === "expense" || type === "income" || type === "transfer" ? type : null,
    account: account && context.accounts.some((item) => item.id === account) ? account : null,
    category:
      category === "none" || (category && context.categories.some((item) => item.id === category)) ? category : null,
    q: (first(params.q) ?? "").trim().slice(0, 80),
    group: first(params.group)?.trim() || null,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 5000) : PAGE_SIZE,
  };
}

/** URL da tela com os filtros (o mês atual fica implícito). */
export function transactionsHref(filters: TransactionFilters, currentMonth: MonthKey) {
  const params = new URLSearchParams();
  if (filters.group) {
    params.set("group", filters.group);
  } else {
    if (filters.month !== currentMonth) params.set("month", filters.month);
    if (filters.type) params.set("type", filters.type);
    if (filters.account) params.set("account", filters.account);
    if (filters.category) params.set("category", filters.category);
    if (filters.q) params.set("q", filters.q);
    if (filters.limit !== PAGE_SIZE) params.set("limit", String(filters.limit));
  }
  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

export function hasActiveFilters(filters: TransactionFilters) {
  return Boolean(filters.type || filters.account || filters.category || filters.q);
}

/** Sem acento e sem caixa: "farmacia" acha "Farmácia". */
function fold(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function filterTransactions(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
  if (filters.group) {
    return transactions
      .filter((tx) => tx.installment?.groupId === filters.group)
      .sort((a, b) => (a.installment?.index ?? 0) - (b.installment?.index ?? 0));
  }
  const needle = fold(filters.q);
  // Busca por número também acha pelo valor ("42,90").
  const amount = /^[\d.,]+$/.test(filters.q) ? parseMoneyInput(filters.q) : null;
  return transactions.filter((tx) => {
    if (filters.month !== "all" && tx.competence !== filters.month) return false;
    if (filters.type === "expense" && tx.type !== "expense" && tx.type !== "refund") return false;
    if (filters.type === "income" && tx.type !== "income") return false;
    if (filters.type === "transfer" && tx.type !== "transfer") return false;
    if (filters.account && tx.accountId !== filters.account && tx.toAccountId !== filters.account) return false;
    if (filters.category === "none" && (tx.categoryId || tx.type === "transfer")) return false;
    if (filters.category && filters.category !== "none" && tx.categoryId !== filters.category) return false;
    if (needle && !fold(`${tx.description} ${tx.notes}`).includes(needle) && tx.amountCents !== amount) return false;
    return true;
  });
}

export type TransactionsSummary = {
  incomeCents: Cents;
  /** Gastos − estornos. */
  outCents: Cents;
  resultCents: Cents;
  transferCents: Cents;
  count: number;
};

export function summarizeTransactions(transactions: Transaction[]): TransactionsSummary {
  let incomeCents = 0;
  let outCents = 0;
  let transferCents = 0;
  for (const tx of transactions) {
    if (tx.type === "income") incomeCents += tx.amountCents;
    else if (tx.type === "expense") outCents += tx.amountCents;
    else if (tx.type === "refund") outCents -= tx.amountCents;
    else transferCents += tx.amountCents;
  }
  return {
    incomeCents,
    outCents,
    resultCents: incomeCents - outCents,
    transferCents,
    count: transactions.length,
  };
}

export type InstallmentGroup = {
  description: string;
  count: number;
  /** Parcelas que ainda existem (excluir "esta e as próximas" encurta a compra). */
  listed: number;
  totalCents: Cents;
  installmentCents: Cents;
  accountId: string;
  date: DateStr;
  firstInvoice: MonthKey | null;
  lastInvoice: MonthKey | null;
};

export function describeInstallmentGroup(items: Transaction[]): InstallmentGroup | null {
  const head = items[0];
  const tail = items[items.length - 1];
  if (!head || !tail) return null;
  return {
    description: head.description,
    count: head.installment?.count ?? items.length,
    listed: items.length,
    totalCents: items.reduce((total, tx) => total + tx.amountCents, 0),
    installmentCents: tail.amountCents,
    accountId: head.accountId,
    date: head.date,
    firstInvoice: head.invoiceMonth,
    lastInvoice: tail.invoiceMonth,
  };
}
