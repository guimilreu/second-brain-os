import { z } from "zod";
import { TRANSFER_KINDS } from "@/models/Transfer";

const accountTypeEnum = z.enum([
  "checking",
  "savings",
  "wallet",
  "investment",
  "credit",
  "loan",
]);

export const bankAccountSchema = z.object({
  name: z.string().min(2),
  institution: z.string().min(2),
  type: accountTypeEnum.default("checking"),
  subtype: z.string().optional().default(""),
  currency: z.string().length(3).default("BRL"),
  balance: z.coerce.number().default(0),
  openingBalance: z.coerce.number().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  closingDay: z.coerce.number().min(1).max(31).optional(),
  dueDay: z.coerce.number().min(1).max(31).optional(),
  interestRateMonthly: z.coerce.number().min(0).optional(),
  includeInNetWorth: z.coerce.boolean().optional().default(true),
  displayOrder: z.coerce.number().optional().default(0),
  safeMinimum: z.coerce.number().min(0).optional().default(0),
  color: z.string().default("#ffc100"),
  icon: z.string().default("Landmark"),
});

export const bankAccountPatchSchema = bankAccountSchema.partial();

const transactionStatusEnum = z.enum([
  "planned",
  "scheduled",
  "confirmed",
  "late",
  "cancelled",
]);

const paymentMethodEnum = z.enum([
  "pix",
  "debit",
  "credit",
  "cash",
  "boleto",
  "ted",
  "internal",
]);

export const transactionSchema = z.object({
  bankAccountId: z.string().optional(),
  recurringRuleId: z.string().optional(),
  recurringOccurrenceDate: z.coerce.date().optional(),
  title: z.string().min(2),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  status: transactionStatusEnum.default("confirmed"),
  occurredAt: z.coerce.date(),
  notes: z.string().optional().default(""),
  payee: z.string().optional().default(""),
  paymentMethod: paymentMethodEnum.optional(),
  tags: z.array(z.string()).optional().default([]),
  includeInAccountBalance: z.coerce.boolean().optional().default(true),
  reconciled: z.coerce.boolean().optional().default(false),
  currency: z.string().length(3).optional().default("BRL"),
  splits: z
    .array(
      z.object({
        category: z.string().min(1),
        amount: z.coerce.number().min(0),
        notes: z.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
  attachments: z
    .array(
      z.object({
        url: z.string().min(1),
        name: z.string().optional().default(""),
        mime: z.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
  externalId: z.string().optional(),
  importBatchId: z.string().optional(),
  wishlistItemId: z.string().optional(),
  projectId: z.string().optional(),
});

export const transactionPatchSchema = transactionSchema.partial();

const cadenceEnum = z.enum(["weekly", "monthly", "biweekly", "yearly", "custom"]);

export const recurringRuleSchema = z
  .object({
    title: z.string().min(2),
    amount: z.coerce.number().positive(),
    type: z.enum(["income", "expense"]),
    category: z.string().min(1),
    cadence: cadenceEnum,
    intervalDays: z.coerce.number().min(1).max(365).optional(),
    dayOfWeek: z.coerce.number().min(0).max(6).optional(),
    dayOfMonth: z.coerce.number().min(1).max(31).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
    endsAfterOccurrences: z.coerce.number().min(1).optional(),
    isActive: z.boolean().default(true),
    allocationPercent: z.coerce.number().min(0).max(100).default(0),
    savingsPotId: z.string().optional(),
    paymentMethod: paymentMethodEnum.optional(),
    creditCardAccountId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.cadence === "weekly" || data.cadence === "biweekly") {
      if (data.dayOfWeek === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe dayOfWeek para recorrência semanal ou quinzenal.",
        });
      }
    }
    if (data.cadence === "monthly") {
      if (data.dayOfMonth === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe dayOfMonth para recorrência mensal.",
        });
      }
    }
    if (data.cadence === "custom" && data.intervalDays === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe intervalDays para recorrência custom.",
      });
    }
  });

export const recurringRulePatchSchema = z.object({
  title: z.string().min(2).optional(),
  amount: z.coerce.number().positive().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(1).optional(),
  cadence: cadenceEnum.optional(),
  intervalDays: z.coerce.number().min(1).max(365).optional(),
  dayOfWeek: z.coerce.number().min(0).max(6).optional(),
  dayOfMonth: z.coerce.number().min(1).max(31).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  endsAfterOccurrences: z.coerce.number().min(1).optional(),
  isActive: z.boolean().optional(),
  allocationPercent: z.coerce.number().min(0).max(100).optional(),
  savingsPotId: z.string().optional(),
  paymentMethod: paymentMethodEnum.optional(),
  creditCardAccountId: z.string().optional(),
  lastGeneratedAt: z.coerce.date().optional(),
});

const potKindEnum = z.enum(["reserve", "goal", "bill-fund", "investment-target"]);

export const savingsPotSchema = z.object({
  bankAccountId: z.string().min(1),
  name: z.string().min(2),
  kind: potKindEnum.default("reserve"),
  targetAmount: z.coerce.number().min(0),
  currentAmount: z.coerce.number().min(0).default(0),
  monthlyContributionTarget: z.coerce.number().min(0).optional(),
  linkedGoalId: z.string().optional(),
  color: z.string().default("#16a34a"),
  icon: z.string().default("PiggyBank"),
  priority: z.coerce.number().default(1),
});

export const savingsPotPatchSchema = savingsPotSchema.partial();

export const financialGoalSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(""),
  targetAmount: z.coerce.number().min(0),
  currentAmount: z.coerce.number().min(0).default(0),
  dueDate: z.coerce.date().optional(),
  status: z.enum(["active", "paused", "completed"]).default("active"),
});

export const financialGoalPatchSchema = financialGoalSchema.partial();

export const transferCreateSchema = z
  .object({
    kind: z.enum(TRANSFER_KINDS),
    fromAccountId: z.string().optional(),
    fromPotId: z.string().optional(),
    toAccountId: z.string().optional(),
    toPotId: z.string().optional(),
    creditCardInvoiceId: z.string().optional(),
    amount: z.coerce.number().positive(),
    fee: z.coerce.number().min(0).optional().default(0),
    occurredAt: z.coerce.date(),
    notes: z.string().optional().default(""),
    status: z.enum(["scheduled", "confirmed"]).optional().default("confirmed"),
  })
  .superRefine((data, ctx) => {
    const { kind } = data;
    if (kind === "account-to-account") {
      if (!data.fromAccountId || !data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fromAccountId e toAccountId são obrigatórios.",
        });
      }
    }
    if (kind === "account-to-pot") {
      if (!data.fromAccountId || !data.toPotId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fromAccountId e toPotId são obrigatórios.",
        });
      }
    }
    if (kind === "pot-to-account") {
      if (!data.fromPotId || !data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fromPotId e toAccountId são obrigatórios.",
        });
      }
    }
    if (kind === "pot-to-pot") {
      if (!data.fromPotId || !data.toPotId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fromPotId e toPotId são obrigatórios.",
        });
      }
    }
    if (kind === "invoice-payment") {
      if (!data.fromAccountId || !data.creditCardInvoiceId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fromAccountId e creditCardInvoiceId são obrigatórios para pagamento de fatura.",
        });
      }
    }
    if (kind === "investment-deposit" || kind === "investment-withdraw") {
      if (!data.fromAccountId || !data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fromAccountId e toAccountId são obrigatórios para movimentação de investimento.",
        });
      }
    }
  });

export const categoryCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  kind: z.enum(["income", "expense", "both"]).default("expense"),
  parentId: z.string().optional(),
  color: z.string().optional().default("#94a3b8"),
  icon: z.string().optional().default("Tag"),
  displayOrder: z.coerce.number().optional().default(0),
});

export const categoryBudgetSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  category: z.string().min(1),
  plannedAmount: z.coerce.number().min(0),
  rolloverFromPrevious: z.coerce.boolean().optional().default(false),
  notes: z.string().optional().default(""),
});

export const categoryBudgetPatchSchema = categoryBudgetSchema.partial();

export const updateByIdSchema = z.object({
  id: z.string().min(1),
  updates: z.record(z.string(), z.unknown()),
});
