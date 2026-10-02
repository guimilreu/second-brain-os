import { cache } from "react";
import { Types } from "mongoose";
import { overdueOccurrences } from "@/features/finance/domain/recurring";
import { todayInTimezone } from "@/features/finance/domain/dates";
import type { FinanceData } from "@/features/finance/domain/plan";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { createLogger, serializeError } from "@/lib/logger";
import { Account } from "@/models/Account";
import { Category } from "@/models/Category";
import { Recurring } from "@/models/Recurring";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";
import { DEFAULT_CATEGORIES, DEFAULT_TIMEZONE } from "./defaults";
import { CURRENT_TRANSACTION_FILTER, ensureFinanceIndexes } from "./indexes";
import { toAccount, toCategory, toRecurring, toTransaction } from "./mappers";
import { occurrenceToDoc } from "./writes";

const log = createLogger("finance");

export type FinanceContext = FinanceData & {
  userId: string;
  userName: string;
  settings: { cdiAnnualPct: number | null; timezone: string };
  setupCompleted: boolean;
};

type CategoryRow = { _id: Types.ObjectId; name: string; kind: string; systemKey?: string | null };

declare global {
  var categorySync: Map<string, Promise<void>> | undefined;
}

// Layout, página e prefetch das rotas chegam juntos: sem fila, cada requisição via "nenhuma categoria"
// e criava todas de novo. O app roda num processo só, então basta uma tarefa por usuário por vez.
const categorySync = (global.categorySync ??= new Map<string, Promise<void>>());

export function ensureDefaultCategories(userId: string): Promise<void> {
  const running = categorySync.get(userId);
  if (running) return running;
  const task = syncDefaultCategories(userId).finally(() => categorySync.delete(userId));
  categorySync.set(userId, task);
  return task;
}

/**
 * Garante as categorias padrão. Categorias do app antigo (sem `systemKey`) são arquivadas — não
 * apagadas — e trocadas pelas novas. Em contas já migradas: repõe as de sistema que faltarem
 * (conferência de saldo e configuração inicial dependem delas) e arruma as que sobram.
 */
async function syncDefaultCategories(userId: string) {
  const existing = await Category.find({ userId })
    .select({ name: 1, kind: 1, systemKey: 1 })
    .sort({ _id: 1 })
    .lean<CategoryRow[]>();
  const current = existing.filter((category) => category.systemKey !== undefined);

  if (!current.length) {
    if (existing.length) {
      await Category.updateMany({ userId, systemKey: { $exists: false } }, { $set: { archived: true } });
    }
    await Category.insertMany(
      DEFAULT_CATEGORIES.map((category, index) => ({ ...category, userId, sortOrder: index })),
    );
    return;
  }

  await removeLeftoverCategories(userId, current);

  const missing = DEFAULT_CATEGORIES.filter(
    (category) =>
      category.systemKey &&
      !current.some((item) => item.systemKey === category.systemKey && item.kind === category.kind),
  );
  if (missing.length) {
    await Category.insertMany(
      missing.map((category, index) => ({ ...category, userId, sortOrder: 100 + index })),
    );
  }
}

/**
 * Cópias repetidas (mesmo nome, tipo e papel) e categorias de sistema que saíram do app somem quando
 * nada as usa. Usadas ficam: a cópia continua, e a de sistema vira categoria comum arquivada.
 */
async function removeLeftoverCategories(userId: string, categories: CategoryRow[]) {
  const systemKeys = new Set<string | null>(DEFAULT_CATEGORIES.map((category) => category.systemKey));
  const retired = categories.filter((category) => category.systemKey && !systemKeys.has(category.systemKey));
  const groups = new Map<string, CategoryRow[]>();
  for (const category of categories) {
    const key = `${category.kind}|${category.systemKey ?? ""}|${category.name}`;
    groups.set(key, [...(groups.get(key) ?? []), category]);
  }
  const repeated = [...groups.values()].filter((group) => group.length > 1);
  if (!repeated.length && !retired.length) return;

  const ids = [...repeated.flat(), ...retired].map((category) => category._id);
  const filter = { userId, categoryId: { $in: ids } };
  const [inTransactions, inRecurrings] = await Promise.all([
    Transaction.distinct("categoryId", filter),
    Recurring.distinct("categoryId", filter),
  ]);
  const used = new Set([...inTransactions, ...inRecurrings].map(String));
  const isUsed = (category: CategoryRow) => used.has(String(category._id));

  const unused = new Set(retired.filter((category) => !isUsed(category)));
  for (const group of repeated) {
    const keep = group.find(isUsed) ?? group[0];
    for (const category of group) if (category !== keep && !isUsed(category)) unused.add(category);
  }
  if (unused.size) {
    await Category.deleteMany({ userId, _id: { $in: [...unused].map((category) => category._id) } });
  }
  const archived = retired.filter((category) => !unused.has(category));
  if (archived.length) {
    await Category.updateMany(
      { userId, _id: { $in: archived.map((category) => category._id) } },
      { $set: { systemKey: null, archived: true } },
    );
  }
}

/**
 * Carrega tudo do usuário (é um app pessoal: o volume cabe em memória) e lança sozinhas as
 * recorrências automáticas que já venceram. Cacheado por requisição: layout e página compartilham.
 */
export const loadFinance = cache(async (): Promise<FinanceContext> => {
  const session = await requireCurrentUser();
  await connectToDatabase();
  await ensureFinanceIndexes();
  await ensureDefaultCategories(session.userId);
  const userId = new Types.ObjectId(session.userId);

  const [user, accountDocs, categoryDocs, recurringDocs, transactionDocs] = await Promise.all([
    User.findById(userId).lean<Record<string, unknown>>(),
    Account.find({ userId }).sort({ sortOrder: 1, createdAt: 1 }).lean<Record<string, unknown>[]>(),
    Category.find({ userId }).sort({ sortOrder: 1, name: 1 }).lean<Record<string, unknown>[]>(),
    Recurring.find({ userId }).sort({ dayOfMonth: 1 }).lean<Record<string, unknown>[]>(),
    Transaction.find({ userId, ...CURRENT_TRANSACTION_FILTER })
      .sort({ date: -1, createdAt: -1 })
      .lean<Record<string, unknown>[]>(),
  ]);

  const timezone = String(user?.timezone ?? DEFAULT_TIMEZONE);
  const today = todayInTimezone(timezone);
  const accounts = accountDocs.map((doc) => toAccount(doc as never));
  const categories = categoryDocs.map((doc) => toCategory(doc as never));
  const recurrings = recurringDocs.map((doc) => toRecurring(doc as never));
  const transactions = transactionDocs.map((doc) => toTransaction(doc as never));

  const due = overdueOccurrences(recurrings, accounts, transactions, today).filter(
    (occurrence) => occurrence.recurring.autoPost,
  );
  if (due.length) {
    try {
      const created = await Transaction.insertMany(
        due.map((occurrence) => occurrenceToDoc(session.userId, occurrence, {})),
        { ordered: false },
      );
      transactions.unshift(...created.map((doc) => toTransaction(doc.toObject() as never)));
    } catch (error) {
      // Corrida entre duas requisições: o índice único impede lançamento duplicado.
      log.warn("Falha ao lançar recorrências automáticas", serializeError(error));
    }
  }

  return {
    userId: session.userId,
    userName: String(user?.name ?? session.name),
    settings: { cdiAnnualPct: (user?.cdiAnnualPct as number | null) ?? null, timezone },
    setupCompleted: Boolean(user?.setupCompletedAt) || accounts.length > 0,
    accounts,
    categories,
    recurrings,
    transactions,
    today,
  };
});
