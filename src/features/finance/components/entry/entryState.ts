import type { EntrySuggestion } from "@/features/finance/domain/suggestions";
import type { Account, DateStr, MonthKey, PaymentMethod, Transaction } from "@/features/finance/domain/types";
import { centsToInput } from "@/lib/utils/format";
import type { EntryDraft } from "@/stores/entry-store";
import { chosenInvoiceOf, type AmountMode, type EntryMode } from "./entryLogic";

export type EntryScope = "group" | "single";

/**
 * Estado do formulário. `null`/`undefined` = automático: o valor vem do texto digitado, da sugestão
 * reconhecida ou do padrão — e nunca passa por cima do que foi escolhido à mão.
 */
export type EntryFormState = {
  mode: EntryMode;
  refund: boolean;
  text: string;
  /** Só texto digitado aqui é lido em linguagem natural (descrição de atalho/edição fica como está). */
  parseText: boolean;
  picked: EntrySuggestion | null;
  amountText: string | null;
  amountMode: AmountMode;
  installments: number | null;
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null | undefined;
  method: PaymentMethod | null | undefined;
  date: DateStr | null;
  invoiceMonth: MonthKey | null;
  notes: string;
  scope: EntryScope;
  showMore: boolean;
  /** Herdado do lançamento anterior ("Salvar e lançar outro"): padrão, mas o texto ainda manda. */
  base: { accountId: string | null; toAccountId: string | null; date: DateStr | null };
  /** Muda a cada "Salvar e lançar outro" para zerar grades e seletores abertos. */
  round: number;
};

const EMPTY_BASE = { accountId: null, toAccountId: null, date: null };

export function initialEntryState(
  draft: EntryDraft | null,
  editing: Transaction | null,
  accounts: Account[],
): EntryFormState {
  if (editing) {
    const account = accounts.find((item) => item.id === editing.accountId);
    const groupCount = editing.installment && editing.installment.count > 1 ? editing.installment.count : null;
    return {
      mode: editing.type === "refund" ? "income" : editing.type,
      refund: editing.type === "refund",
      text: editing.description,
      parseText: false,
      picked: null,
      amountText: centsToInput(editing.amountCents),
      // Compra parcelada: refaz o grupo a partir do valor da parcela (o total não está no lançamento).
      amountMode: groupCount ? "installment" : "total",
      installments: groupCount,
      accountId: editing.accountId,
      toAccountId: editing.toAccountId,
      categoryId: editing.categoryId,
      method: editing.method,
      date: editing.date,
      invoiceMonth: editing.type === "transfer" ? editing.invoiceMonth : chosenInvoiceOf(account?.card, editing),
      notes: editing.notes,
      scope: groupCount ? "group" : "single",
      showMore: Boolean(editing.notes),
      base: EMPTY_BASE,
      round: 0,
    };
  }
  return {
    mode: draft?.type === "refund" ? "income" : (draft?.type ?? "expense"),
    refund: draft?.type === "refund",
    text: draft?.description ?? "",
    parseText: false,
    picked: null,
    amountText: draft?.amountCents ? centsToInput(draft.amountCents) : null,
    amountMode: "total",
    installments: draft?.installments ?? null,
    accountId: draft?.accountId ?? null,
    toAccountId: draft?.toAccountId ?? null,
    categoryId: draft?.categoryId,
    method: draft?.method,
    date: draft?.date ?? null,
    invoiceMonth: draft?.invoiceMonth ?? null,
    notes: draft?.notes ?? "",
    scope: "single",
    showMore: Boolean(draft?.notes),
    base: EMPTY_BASE,
    round: 0,
  };
}

/** "Salvar e lançar outro": mantém tipo, conta e data; limpa o resto. */
export function nextEntryState(
  state: EntryFormState,
  current: { accountId: string | null; toAccountId: string | null; date: DateStr },
): EntryFormState {
  return {
    ...initialEntryState(null, null, []),
    mode: state.mode,
    refund: state.refund,
    base: current,
    round: state.round + 1,
  };
}
