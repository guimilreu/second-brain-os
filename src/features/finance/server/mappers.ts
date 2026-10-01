import type { Account, Category, CycleOverride, Recurring, Transaction } from "@/features/finance/domain/types";

type Id = { toString(): string } | null | undefined;
type Lean = Record<string, unknown> & { _id: Id };

const idOf = (value: unknown) => (value ? String(value) : null);

export function toAccount(doc: Lean): Account {
  const card = doc.card as Record<string, unknown> | null;
  const goal = doc.goal as Record<string, unknown> | null;
  return {
    id: String(doc._id),
    name: String(doc.name),
    institution: doc.institution as Account["institution"],
    kind: doc.kind as Account["kind"],
    purpose: (doc.purpose as Account["purpose"]) ?? null,
    color: String(doc.color ?? "#00d0ff"),
    yieldCdiPct: (doc.yieldCdiPct as number | null) ?? null,
    openingBalanceCents: Number(doc.openingBalanceCents ?? 0),
    openingDate: String(doc.openingDate),
    archived: Boolean(doc.archived),
    sortOrder: Number(doc.sortOrder ?? 0),
    card: card
      ? {
          closingDay: Number(card.closingDay),
          dueDay: Number(card.dueDay),
          limitCents: (card.limitCents as number | null) ?? null,
          reserveAccountId: idOf(card.reserveAccountId),
          cycleOverrides: ((card.cycleOverrides as CycleOverride[] | undefined) ?? []).map((item) => ({
            month: item.month,
            closingDate: item.closingDate,
            dueDate: item.dueDate,
          })),
        }
      : null,
    goal: goal
      ? {
          targetCents: Number(goal.targetCents),
          targetDate: (goal.targetDate as string | null) ?? null,
          monthlyCents: (goal.monthlyCents as number | null) ?? null,
        }
      : null,
    lastReconciledAt: (doc.lastReconciledAt as string | null) ?? null,
  };
}

export function toTransaction(doc: Lean): Transaction {
  const installment = doc.installment as Record<string, unknown> | null;
  return {
    id: String(doc._id),
    type: doc.type as Transaction["type"],
    amountCents: Number(doc.amountCents),
    description: String(doc.description),
    categoryId: idOf(doc.categoryId),
    accountId: String(doc.accountId),
    toAccountId: idOf(doc.toAccountId),
    date: String(doc.date),
    competence: String(doc.competence),
    method: (doc.method as Transaction["method"]) ?? null,
    invoiceMonth: (doc.invoiceMonth as string | null) ?? null,
    installment: installment
      ? { groupId: String(installment.groupId), index: Number(installment.index), count: Number(installment.count) }
      : null,
    recurringId: idOf(doc.recurringId),
    recurringMonth: (doc.recurringMonth as string | null) ?? null,
    notes: String(doc.notes ?? ""),
  };
}

export function toRecurring(doc: Lean): Recurring {
  return {
    id: String(doc._id),
    type: doc.type as Recurring["type"],
    description: String(doc.description),
    amountCents: Number(doc.amountCents),
    isEstimate: Boolean(doc.isEstimate),
    categoryId: idOf(doc.categoryId),
    accountId: String(doc.accountId),
    method: (doc.method as Recurring["method"]) ?? null,
    frequency: (doc.frequency as Recurring["frequency"]) ?? "monthly",
    dayOfMonth: Number(doc.dayOfMonth),
    monthOfYear: (doc.monthOfYear as number | null) ?? null,
    startMonth: String(doc.startMonth),
    endMonth: (doc.endMonth as string | null) ?? null,
    autoPost: Boolean(doc.autoPost),
    active: doc.active !== false,
    skippedMonths: (doc.skippedMonths as string[] | undefined) ?? [],
  };
}

export function toCategory(doc: Lean): Category {
  return {
    id: String(doc._id),
    name: String(doc.name),
    kind: doc.kind as Category["kind"],
    color: String(doc.color ?? "#64748b"),
    icon: String(doc.icon ?? "tag"),
    limitCents: (doc.limitCents as number | null) ?? null,
    archived: Boolean(doc.archived),
    sortOrder: Number(doc.sortOrder ?? 0),
    systemKey: (doc.systemKey as Category["systemKey"]) ?? null,
  };
}
