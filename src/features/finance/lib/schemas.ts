import { z } from "zod";

export const bankAccountSchema = z.object({
  name: z.string().min(2),
  institution: z.string().min(2),
  type: z.enum(["checking", "savings", "wallet", "investment", "credit"]).default("checking"),
  balance: z.coerce.number().default(0),
  color: z.string().default("#ffc100"),
  icon: z.string().default("Landmark"),
});

export const transactionSchema = z.object({
  bankAccountId: z.string().optional(),
  recurringRuleId: z.string().optional(),
  recurringOccurrenceDate: z.coerce.date().optional(),
  title: z.string().min(2),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(2),
  status: z.enum(["planned", "confirmed", "late", "cancelled"]).default("confirmed"),
  occurredAt: z.coerce.date(),
  notes: z.string().optional().default(""),
});

export const recurringRuleSchema = z
  .object({
    title: z.string().min(2),
    amount: z.coerce.number().positive(),
    type: z.enum(["income", "expense"]),
    category: z.string().min(2),
    cadence: z.enum(["weekly", "monthly"]),
    dayOfWeek: z.coerce.number().min(0).max(6).optional(),
    dayOfMonth: z.coerce.number().min(1).max(31).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
    isActive: z.boolean().default(true),
    allocationPercent: z.coerce.number().min(0).max(100).default(0),
    savingsPotId: z.string().optional(),
  })
  .refine(
    (data) =>
      data.cadence === "weekly"
        ? data.dayOfWeek !== undefined
        : data.dayOfMonth !== undefined,
    "Informe dayOfWeek para recorrência semanal ou dayOfMonth para mensal.",
  );

export const savingsPotSchema = z.object({
  name: z.string().min(2),
  targetAmount: z.coerce.number().min(0),
  currentAmount: z.coerce.number().min(0).default(0),
  color: z.string().default("#16a34a"),
  icon: z.string().default("PiggyBank"),
  priority: z.coerce.number().default(1),
});

export const financialGoalSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(""),
  targetAmount: z.coerce.number().min(0),
  currentAmount: z.coerce.number().min(0).default(0),
  dueDate: z.coerce.date().optional(),
  status: z.enum(["active", "paused", "completed"]).default("active"),
});

export const updateByIdSchema = z.object({
  id: z.string().min(1),
  updates: z.record(z.string(), z.unknown()),
});
