import { invoiceDates, invoiceMonthFor } from "@/features/finance/domain/card";
import { addMonths } from "@/features/finance/domain/dates";
import { planCardPurchase } from "@/features/finance/domain/installments";
import { INSTITUTION_LABELS, invoiceLabel } from "@/features/finance/domain/labels";
import {
  normalizeDescription,
  resolveAccountForHints,
  type QuickEntryParse,
} from "@/features/finance/domain/quickEntry";
import type { EntrySuggestion } from "@/features/finance/domain/suggestions";
import type {
  Account,
  CardConfig,
  Category,
  CategoryKind,
  Cents,
  DateStr,
  MonthKey,
  TxType,
} from "@/features/finance/domain/types";

export type EntryMode = "expense" | "income" | "transfer";
export type AmountMode = "total" | "installment";

/** "pay": a conta é de onde sai um pagamento (o cofre do dia a dia vira "Mercado Pago · PIX"). */
export type AccountContext = "pay" | "other";

export function capitalize(text: string) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

/** Rótulo curto, do jeito que o GM pensa: "Nubank · crédito", "Mercado Pago · PIX", "Inter". */
export function accountLabel(account: Account, accounts: Account[], context: AccountContext = "other"): string {
  if (account.institution === "other" || account.kind === "cash") return account.name;
  const institution = INSTITUTION_LABELS[account.institution];
  if (account.kind === "credit_card") return `${institution} · crédito`;
  if (account.kind === "pocket") {
    return context === "pay" && account.purpose === "operating"
      ? `${institution} · PIX`
      : `${institution} · ${account.name}`;
  }
  const hasSibling = accounts.some(
    (other) =>
      other.id !== account.id &&
      !other.archived &&
      other.institution === account.institution &&
      (other.kind !== "pocket" || other.purpose === "operating"),
  );
  return hasSibling ? `${institution} · conta` : institution;
}

/** Contas de onde ele paga/recebe no dia a dia (viram atalhos); cofres de reserva/meta ficam em "Outra conta". */
function isEverydayAccount(account: Account) {
  return (
    account.kind === "checking" ||
    account.kind === "credit_card" ||
    account.kind === "cash" ||
    account.purpose === "operating"
  );
}

function kindPriority(account: Account) {
  if (account.purpose === "operating") return 0;
  if (account.kind === "credit_card") return 1;
  if (account.kind === "checking") return 2;
  return 3;
}

/** Ordem dos atalhos: mais usadas primeiro; Inter (quase parado) e arquivadas no fim. */
export function sortAccounts(accounts: Account[], usage: Record<string, number>) {
  return [...accounts].sort(
    (a, b) =>
      Number(a.archived) - Number(b.archived) ||
      Number(a.institution === "inter") - Number(b.institution === "inter") ||
      (usage[b.id] ?? 0) - (usage[a.id] ?? 0) ||
      kindPriority(a) - kindPriority(b) ||
      a.sortOrder - b.sortOrder,
  );
}

export function accountOptions(accounts: Account[], usage: Record<string, number>, type: TxType) {
  // Entrada no cartão não existe; estorno pode voltar para o cartão.
  const eligible = accounts.filter((account) => type !== "income" || account.kind !== "credit_card");
  const sorted = sortAccounts(eligible, usage);
  // Onde há cofre do dia a dia (Mercado Pago), ele representa a instituição; o saldo em conta
  // só vira atalho se for de fato usado.
  const hasOperating = (account: Account) =>
    accounts.some((other) => !other.archived && other.purpose === "operating" && other.institution === account.institution);
  const isShortcut = (account: Account) =>
    !account.archived &&
    isEverydayAccount(account) &&
    !(account.kind === "checking" && hasOperating(account) && !(usage[account.id] > 0));
  return {
    primary: sorted.filter(isShortcut),
    others: sorted.filter((account) => !isShortcut(account)),
  };
}

export function defaultAccountId(type: TxType, primary: Account[]): string | null {
  if (type === "income") return (primary.find((account) => account.purpose === "operating") ?? primary[0])?.id ?? null;
  return primary[0]?.id ?? null;
}

export function defaultTransferFromId(accounts: Account[], usage: Record<string, number>): string | null {
  const active = sortAccounts(accounts.filter((account) => !account.archived && account.kind !== "credit_card"), usage);
  return (active.find((account) => account.purpose === "operating") ?? active[0])?.id ?? null;
}

/**
 * Conta citada no texto. Só o banco ("ifood 42 nubank") fica com a conta desse banco que ele mais usa
 * em gastos — para o GM, o cartão; sem histórico, vale a regra do domínio.
 */
export function hintedAccount(
  accounts: Account[],
  parse: QuickEntryParse,
  usage: Record<string, number>,
  type: TxType,
): Account | null {
  const allowCard = type !== "income";
  if (parse.institution && !parse.method) {
    const used = accounts
      .filter(
        (account) =>
          !account.archived &&
          account.institution === parse.institution &&
          isEverydayAccount(account) &&
          (allowCard || account.kind !== "credit_card") &&
          (usage[account.id] ?? 0) > 0,
      )
      .sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0));
    if (used[0]) return used[0];
  }
  const resolved = resolveAccountForHints(accounts, { institution: parse.institution, method: parse.method });
  if (resolved && !allowCard && resolved.kind === "credit_card") return null;
  return resolved;
}

export function categoryKindFor(type: TxType): CategoryKind {
  return type === "income" ? "income" : "expense";
}

export function selectableCategories(categories: Category[], kind: CategoryKind) {
  return categories.filter((category) => category.kind === kind && !category.archived && !category.systemKey);
}

/** Categorias mais usadas (pelo histórico de descrições); empate mantém a ordem definida pelo usuário. */
export function topCategories(
  categories: Category[],
  suggestions: EntrySuggestion[],
  kind: CategoryKind,
  limit: number,
): Category[] {
  const usage = new Map<string, number>();
  for (const suggestion of suggestions) {
    if (suggestion.categoryId) {
      usage.set(suggestion.categoryId, (usage.get(suggestion.categoryId) ?? 0) + suggestion.count);
    }
  }
  return [...selectableCategories(categories, kind)]
    .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0))
    .slice(0, limit);
}

export function suggestionPool(suggestions: EntrySuggestion[], type: TxType) {
  if (type === "refund") return suggestions.filter((item) => item.type === "refund" || item.type === "expense");
  return suggestions.filter((item) => item.type === type);
}

/** `exact`: mesma descrição já usada (aplica categoria/conta sozinho); `matches`: autocompletar. */
export function findSuggestions(pool: EntrySuggestion[], description: string, limit = 5) {
  const needle = normalizeDescription(description);
  if (!needle) return { exact: null, matches: [] as EntrySuggestion[] };
  let exact: EntrySuggestion | null = null;
  const scored: { suggestion: EntrySuggestion; score: number }[] = [];
  for (const suggestion of pool) {
    if (suggestion.key === needle) {
      exact ??= suggestion;
      continue;
    }
    const position = suggestion.key.indexOf(needle);
    if (position === -1) continue;
    const score = position === 0 ? 0 : suggestion.key[position - 1] === " " ? 1 : 2;
    scored.push({ suggestion, score });
  }
  scored.sort((a, b) => a.score - b.score || b.suggestion.count - a.suggestion.count);
  return { exact, matches: scored.slice(0, limit).map((item) => item.suggestion) };
}

export type CardPurchasePreview = {
  /** Fatura em que cairia sem escolha manual. */
  autoInvoice: MonthKey;
  firstInvoice: MonthKey;
  lastInvoice: MonthKey;
  closingDate: DateStr;
  dueDate: DateStr;
  count: number;
  totalCents: Cents | null;
  /** Valor de cada parcela (sem os centavos que sobram, que vão na primeira). */
  installmentCents: Cents | null;
  /** Quanto cai em cada fatura, a partir da primeira. */
  amounts: Cents[];
};

export function cardPurchasePreview(
  card: CardConfig,
  date: DateStr,
  amountCents: Cents | null,
  count: number,
  amountMode: AmountMode,
  chosenInvoice: MonthKey | null,
): CardPurchasePreview {
  const autoInvoice = invoiceMonthFor(card, date);
  const firstInvoice = chosenInvoice ?? autoInvoice;
  const totalCents =
    amountCents === null ? null : amountMode === "installment" && count > 1 ? amountCents * count : amountCents;
  // Escolher outra fatura desloca a compra inteira (o servidor faz o mesmo).
  const plan = totalCents ? planCardPurchase(card, date, totalCents, count) : [];
  return {
    autoInvoice,
    firstInvoice,
    lastInvoice: addMonths(firstInvoice, count - 1),
    ...invoiceDates(card, firstInvoice),
    count,
    totalCents,
    installmentCents: plan.length ? plan[plan.length - 1].amountCents : null,
    amounts: plan.map((item) => item.amountCents),
  };
}

export type PurchaseImpact = {
  month: MonthKey;
  beforeCents: Cents;
  afterCents: Cents;
  /** Primeiro mês seguinte que uma parcela deixa no negativo. */
  negativeMonth: MonthKey | null;
};

/** "Posso comprar isso?": o "ainda pode gastar" de cada mês afetado, antes e depois. */
export function purchaseImpact(
  monthFree: { month: MonthKey; freeCents: Cents }[],
  firstMonth: MonthKey,
  amounts: Cents[],
): PurchaseImpact | null {
  const free = new Map(monthFree.map((item) => [item.month, item.freeCents]));
  const beforeCents = free.get(firstMonth);
  if (beforeCents === undefined || !amounts.length) return null;
  let negativeMonth: MonthKey | null = null;
  for (let index = 1; index < amounts.length && !negativeMonth; index += 1) {
    const month = addMonths(firstMonth, index);
    const before = free.get(month);
    if (before !== undefined && before >= 0 && before - amounts[index] < 0) negativeMonth = month;
  }
  return { month: firstMonth, beforeCents, afterCents: beforeCents - amounts[0], negativeMonth };
}

/** Faturas que fazem sentido pagar agora: a última fechada e a aberta (+ a do atalho, se for outra). */
export function paymentInvoiceOptions(card: CardConfig, today: DateStr, preset: MonthKey | null): MonthKey[] {
  const open = invoiceMonthFor(card, today);
  const months = new Set([addMonths(open, -1), open]);
  if (preset) months.add(preset);
  return [...months].sort();
}

export function transferDescription(
  from: Account | undefined,
  to: Account | undefined,
  invoiceMonth: MonthKey | null,
  currentYear: number,
): string {
  if (to?.card) return invoiceMonth ? `Pagamento da ${invoiceLabel(invoiceMonth, currentYear)}` : "Pagamento da fatura";
  if (from && to) return `${from.name} → ${to.name}`;
  return "Transferência";
}

/** Fatura escolhida à mão numa compra existente (a 1ª da compra, quando parcelada) ou null se é a automática. */
export function chosenInvoiceOf(
  card: CardConfig | null | undefined,
  tx: { date: DateStr; invoiceMonth: MonthKey | null; installment: { index: number } | null },
): MonthKey | null {
  if (!card || !tx.invoiceMonth) return null;
  const first = addMonths(tx.invoiceMonth, -((tx.installment?.index ?? 1) - 1));
  return first === invoiceMonthFor(card, tx.date) ? null : first;
}
