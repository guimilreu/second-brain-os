import { z } from "zod";
import { isDateStr, isMonthKey } from "@/features/finance/domain/dates";
import {
  ACCOUNT_KINDS,
  ACCOUNT_PURPOSES,
  INSTITUTIONS,
  PAYMENT_METHODS,
  TX_TYPES,
} from "@/features/finance/domain/types";

export const dateStr = z.string().refine(isDateStr, "Data inválida.");
export const monthKey = z.string().refine(isMonthKey, "Mês inválido.");
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Identificador inválido.");
export const cents = z.number().int("Valor inválido.").positive("Informe um valor maior que zero.");
const signedCents = z.number().int("Valor inválido.");

export const entrySchema = z.object({
  type: z.enum(TX_TYPES),
  amountCents: cents,
  description: z.string().trim().min(1, "Descreva o lançamento.").max(120),
  categoryId: objectId.nullable().default(null),
  accountId: objectId,
  toAccountId: objectId.nullable().default(null),
  date: dateStr,
  method: z.enum(PAYMENT_METHODS).nullable().default(null),
  notes: z.string().max(500).default(""),
  installments: z.number().int().min(1).max(48).default(1),
  amountMode: z.enum(["total", "installment"]).default("total"),
  invoiceMonth: monthKey.nullable().default(null),
  recurringId: objectId.nullable().default(null),
  recurringMonth: monthKey.nullable().default(null),
});
export type EntryPayload = z.input<typeof entrySchema>;

export const updateEntrySchema = z.object({
  id: objectId,
  /** "group" refaz a compra parcelada inteira; "single" altera só este lançamento. */
  scope: z.enum(["single", "group"]).default("single"),
  entry: entrySchema,
});

export const deleteEntrySchema = z.object({
  id: objectId,
  /** "following" cancela esta parcela e as seguintes. */
  scope: z.enum(["single", "group", "following"]).default("single"),
});

export const moveInvoiceSchema = z.object({
  id: objectId,
  month: monthKey,
  scope: z.enum(["single", "group"]).default("single"),
});

export const confirmOccurrenceSchema = z.object({
  recurringId: objectId,
  month: monthKey,
  amountCents: cents.optional(),
  date: dateStr.optional(),
});

export const skipOccurrenceSchema = z.object({ recurringId: objectId, month: monthKey });

export const recurringSchema = z.object({
  id: objectId.optional(),
  type: z.enum(["expense", "income"]),
  description: z.string().trim().min(1, "Dê um nome.").max(80),
  amountCents: cents,
  isEstimate: z.boolean().default(false),
  categoryId: objectId.nullable().default(null),
  accountId: objectId,
  method: z.enum(PAYMENT_METHODS).nullable().default(null),
  frequency: z.enum(["monthly", "yearly"]).default("monthly"),
  dayOfMonth: z.number().int().min(1).max(31),
  monthOfYear: z.number().int().min(1).max(12).nullable().default(null),
  startMonth: monthKey.optional(),
  endMonth: monthKey.nullable().default(null),
  autoPost: z.boolean().default(false),
  active: z.boolean().default(true),
});
export type RecurringPayload = z.input<typeof recurringSchema>;

export const accountSchema = z.object({
  id: objectId.optional(),
  name: z.string().trim().min(1, "Dê um nome.").max(60),
  institution: z.enum(INSTITUTIONS).default("other"),
  kind: z.enum(ACCOUNT_KINDS),
  purpose: z.enum(ACCOUNT_PURPOSES).nullable().default(null),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#00d0ff"),
  yieldCdiPct: z.number().min(0).max(300).nullable().default(null),
  /** Saldo atual informado (contas e cofrinhos). Na edição, ajusta o saldo inicial. */
  balanceCents: signedCents.optional(),
  card: z
    .object({
      dueDay: z.number().int().min(1).max(31),
      closingDaysBeforeDue: z.number().int().min(1).max(25).default(7),
      limitCents: z.number().int().min(0).nullable().default(null),
      reserveAccountId: objectId.nullable().default(null),
      settledThroughMonth: monthKey.nullable().default(null),
    })
    .nullable()
    .default(null),
  goal: z
    .object({
      targetCents: cents,
      targetDate: dateStr.nullable().default(null),
      monthlyCents: z.number().int().min(0).nullable().default(null),
    })
    .nullable()
    .default(null),
});
export type AccountPayload = z.input<typeof accountSchema>;

export const reconcileSchema = z.object({
  items: z.array(z.object({ accountId: objectId, realBalanceCents: signedCents })).min(1),
});

export const reconcileInvoiceSchema = z.object({
  cardId: objectId,
  month: monthKey,
  realTotalCents: z.number().int().min(0),
});

export const invoiceDatesSchema = z.object({
  cardId: objectId,
  month: monthKey,
  closingDate: dateStr,
  dueDate: dateStr,
});

export const categorySchema = z.object({
  id: objectId.optional(),
  name: z.string().trim().min(1, "Dê um nome.").max(40),
  kind: z.enum(["expense", "income"]),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  icon: z.string().min(1).max(40),
  limitCents: z.number().int().min(0).nullable().default(null),
});
export type CategoryPayload = z.input<typeof categorySchema>;

export const settingsSchema = z.object({
  cdiAnnualPct: z.number().min(0).max(100).nullable().optional(),
  timezone: z.string().min(1).max(64).optional(),
});

const setupAccountSchema = z.object({
  key: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  institution: z.enum(INSTITUTIONS),
  kind: z.enum(ACCOUNT_KINDS),
  purpose: z.enum(ACCOUNT_PURPOSES).nullable().default(null),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  yieldCdiPct: z.number().min(0).max(300).nullable().default(null),
  balanceCents: signedCents.default(0),
  card: z
    .object({
      dueDay: z.number().int().min(1).max(31),
      closingDaysBeforeDue: z.number().int().min(1).max(25).default(7),
      limitCents: z.number().int().min(0).nullable().default(null),
      reserveKey: z.string().nullable().default(null),
      /** Última fatura já paga antes do app; as compras dela e das anteriores ficam como histórico. */
      settledThroughMonth: monthKey.nullable().default(null),
    })
    .nullable()
    .default(null),
  goal: z
    .object({
      targetCents: cents,
      targetDate: dateStr.nullable().default(null),
      monthlyCents: z.number().int().min(0).nullable().default(null),
    })
    .nullable()
    .default(null),
});

export const setupSchema = z.object({
  cdiAnnualPct: z.number().min(0).max(100).nullable().default(null),
  accounts: z.array(setupAccountSchema).min(1),
  recurrings: z
    .array(
      z.object({
        type: z.enum(["expense", "income"]),
        description: z.string().trim().min(1).max(80),
        amountCents: cents,
        isEstimate: z.boolean().default(false),
        categoryId: objectId.nullable().default(null),
        accountKey: z.string(),
        dayOfMonth: z.number().int().min(1).max(31),
        autoPost: z.boolean().default(false),
      }),
    )
    .default([]),
});
export type SetupPayload = z.input<typeof setupSchema>;

export const idSchema = z.object({ id: objectId });
export const archiveSchema = z.object({ id: objectId, archived: z.boolean() });
export const searchSchema = z.object({ query: z.string().trim().min(2).max(80) });

export const importCardSchema = z.object({
  cardId: objectId,
  /** Fatura (mês de fechamento) a que o arquivo pertence. */
  month: monthKey,
  rows: z
    .array(
      z.object({
        date: dateStr,
        description: z.string().trim().min(1).max(120),
        amountCents: cents,
        kind: z.enum(["charge", "refund"]),
        categoryId: objectId.nullable().default(null),
        installment: z
          .object({ index: z.number().int().min(1), count: z.number().int().min(2).max(72) })
          .nullable()
          .default(null),
      }),
    )
    .min(1, "Selecione ao menos uma linha.")
    .max(500),
});
export type ImportCardPayload = z.input<typeof importCardSchema>;

export const recordYieldsSchema = z.object({
  /** Mês a que o rendimento se refere (o app do banco mostra quanto rendeu no mês). */
  month: monthKey,
  items: z.array(z.object({ accountId: objectId, amountCents: cents })).min(1, "Informe ao menos um rendimento."),
});

export const settleInvoicesSchema = z.object({
  cardId: objectId,
  /** Faturas até este mês já estavam pagas fora do app; null desfaz. */
  month: monthKey.nullable(),
});
