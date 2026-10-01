import { Types } from "mongoose";
import { invoiceDates, invoiceMonthFor } from "@/features/finance/domain/card";
import { addDays, addMonths, monthDiff, monthOf } from "@/features/finance/domain/dates";
import { planCardPurchase } from "@/features/finance/domain/installments";
import { competenceOf } from "@/features/finance/domain/ledger";
import type { Occurrence } from "@/features/finance/domain/recurring";
import type {
  Account,
  Cents,
  DateStr,
  MonthKey,
  PaymentMethod,
  Transaction,
  TxType,
} from "@/features/finance/domain/types";
import { UserError } from "./result";

export type EntryInput = {
  type: TxType;
  amountCents: Cents;
  description: string;
  categoryId: string | null;
  accountId: string;
  toAccountId: string | null;
  date: DateStr;
  method: PaymentMethod | null;
  notes: string;
  /** Parcelas (só compra no cartão). */
  installments: number;
  /** O valor digitado é o total da compra ou o de cada parcela. */
  amountMode: "total" | "installment";
  /** Fatura escolhida à mão (compra/estorno no cartão) ou fatura paga (transferência para o cartão). */
  invoiceMonth: MonthKey | null;
  recurringId: string | null;
  recurringMonth: MonthKey | null;
};

export type TransactionDoc = {
  userId: Types.ObjectId;
  type: TxType;
  amountCents: Cents;
  description: string;
  categoryId: Types.ObjectId | null;
  accountId: Types.ObjectId;
  toAccountId: Types.ObjectId | null;
  date: DateStr;
  competence: MonthKey;
  method: PaymentMethod | null;
  invoiceMonth: MonthKey | null;
  invoiceLocked: boolean;
  installment: { groupId: string; index: number; count: number } | null;
  recurringId: Types.ObjectId | null;
  recurringMonth: MonthKey | null;
  notes: string;
};

const oid = (value: string | null) => (value ? new Types.ObjectId(value) : null);

/** Monta os documentos de um lançamento (uma compra parcelada vira um documento por parcela). */
export function buildEntryDocs(
  userId: string,
  input: EntryInput,
  accountsById: Map<string, Account>,
  options: { groupId?: string } = {},
): TransactionDoc[] {
  const account = accountsById.get(input.accountId);
  if (!account) throw new UserError("Conta não encontrada.");
  if (!input.description.trim()) throw new UserError("Descreva o lançamento.");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new UserError("Informe um valor maior que zero.");

  const base = {
    userId: new Types.ObjectId(userId),
    type: input.type,
    description: input.description.trim(),
    categoryId: input.type === "transfer" ? null : oid(input.categoryId),
    accountId: new Types.ObjectId(account.id),
    toAccountId: null as Types.ObjectId | null,
    date: input.date,
    method: input.method,
    invoiceLocked: false,
    installment: null as TransactionDoc["installment"],
    recurringId: oid(input.recurringId),
    recurringMonth: input.recurringMonth,
    notes: input.notes ?? "",
  };

  if (input.type === "transfer") {
    const target = input.toAccountId ? accountsById.get(input.toAccountId) : undefined;
    if (!target) throw new UserError("Escolha para onde vai o dinheiro.");
    if (target.id === account.id) throw new UserError("Origem e destino precisam ser diferentes.");
    return [
      {
        ...base,
        amountCents: input.amountCents,
        toAccountId: new Types.ObjectId(target.id),
        invoiceMonth: target.card ? input.invoiceMonth : null,
        competence: monthOf(input.date),
        method: input.method ?? "transfer",
      },
    ];
  }

  const card = account.card;
  if (!card) {
    if (input.installments > 1) throw new UserError("Parcelamento só existe no cartão de crédito.");
    return [
      {
        ...base,
        amountCents: input.amountCents,
        invoiceMonth: null,
        competence: monthOf(input.date),
      },
    ];
  }

  const method = input.method ?? "credit";
  if (input.type === "expense" && input.installments > 1) {
    const totalCents =
      input.amountMode === "installment" ? input.amountCents * input.installments : input.amountCents;
    const plan = planCardPurchase(card, input.date, totalCents, input.installments);
    const shift = input.invoiceMonth ? monthDiff(plan[0].invoiceMonth, input.invoiceMonth) : 0;
    const groupId = options.groupId ?? new Types.ObjectId().toString();
    return plan.map((item) => {
      const invoiceMonth = addMonths(item.invoiceMonth, shift);
      return {
        ...base,
        method,
        amountCents: item.amountCents,
        invoiceMonth,
        invoiceLocked: Boolean(input.invoiceMonth),
        competence: invoiceMonth,
        installment: { groupId, index: item.index, count: item.count },
      };
    });
  }

  const invoiceMonth = input.invoiceMonth ?? invoiceMonthFor(card, input.date);
  return [
    {
      ...base,
      method,
      amountCents: input.amountCents,
      invoiceMonth,
      invoiceLocked: Boolean(input.invoiceMonth),
      competence: competenceOf({ type: input.type, date: input.date, invoiceMonth }),
    },
  ];
}

/** Lançamento a partir de uma ocorrência de recorrência (confirmada ou automática). */
export function occurrenceToDoc(
  userId: string,
  occurrence: Occurrence,
  override: { amountCents?: Cents; date?: DateStr },
): TransactionDoc {
  const { recurring } = occurrence;
  const date = override.date ?? occurrence.date;
  const invoiceMonth = occurrence.invoiceMonth && !override.date ? occurrence.invoiceMonth : null;
  return {
    userId: new Types.ObjectId(userId),
    type: recurring.type,
    amountCents: override.amountCents ?? occurrence.amountCents,
    description: recurring.description,
    categoryId: oid(recurring.categoryId),
    accountId: new Types.ObjectId(recurring.accountId),
    toAccountId: null,
    date,
    competence: invoiceMonth ?? monthOf(date),
    method: recurring.method,
    invoiceMonth,
    invoiceLocked: false,
    installment: null,
    recurringId: new Types.ObjectId(recurring.id),
    recurringMonth: occurrence.month,
    notes: "",
  };
}

/** Recalcula a fatura das compras do cartão (após mudar fechamento/vencimento). Respeita escolhas manuais. */
export function rebucketCardTransactions(
  card: Account,
  transactions: (Transaction & { invoiceLocked?: boolean })[],
): { id: string; invoiceMonth: MonthKey }[] {
  if (!card.card) return [];
  const changes: { id: string; invoiceMonth: MonthKey }[] = [];
  for (const tx of transactions) {
    if (tx.accountId !== card.id || (tx.type !== "expense" && tx.type !== "refund") || tx.invoiceLocked) continue;
    const first = invoiceMonthFor(card.card, tx.date);
    const invoiceMonth = tx.installment ? addMonths(first, tx.installment.index - 1) : first;
    if (invoiceMonth !== tx.invoiceMonth) changes.push({ id: tx.id, invoiceMonth });
  }
  return changes;
}

/**
 * Data de um lançamento de ajuste/abertura de uma fatura: véspera do fechamento,
 * mas nunca no futuro (na fatura aberta, o gasto já aconteceu até hoje).
 */
export function openingDateForInvoice(card: Account, month: MonthKey, today: DateStr): DateStr {
  if (!card.card) throw new UserError("Conta não é um cartão.");
  const dayBeforeClosing = addDays(invoiceDates(card.card, month).closingDate, -1);
  return dayBeforeClosing < today ? dayBeforeClosing : today;
}
