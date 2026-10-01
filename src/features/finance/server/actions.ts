"use server";

import { Types } from "mongoose";
import { refresh } from "next/cache";
import { ZodError, type z } from "zod";
import { invoiceMonthFor, summarizeInvoices } from "@/features/finance/domain/card";
import { addMonths, dayInMonth, monthDiff, monthOf } from "@/features/finance/domain/dates";
import { planOngoingInstallments } from "@/features/finance/domain/installments";
import { balancesByAccount, competenceOf } from "@/features/finance/domain/ledger";
import { parseMoneyInput } from "@/features/finance/domain/money";
import { normalizeDescription } from "@/features/finance/domain/quickEntry";
import { occurrencesBetween, suggestedStartMonth } from "@/features/finance/domain/recurring";
import type { MonthKey, Transaction as TransactionType } from "@/features/finance/domain/types";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { createLogger, serializeError } from "@/lib/logger";
import { Account } from "@/models/Account";
import { Category } from "@/models/Category";
import { Recurring } from "@/models/Recurring";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";
import { UserError, type ActionResult } from "./result";
import {
  accountSchema,
  archiveSchema,
  categorySchema,
  confirmOccurrenceSchema,
  deleteEntrySchema,
  entrySchema,
  idSchema,
  importCardSchema,
  invoiceDatesSchema,
  moveInvoiceSchema,
  ongoingInstallmentsSchema,
  reconcileInvoiceSchema,
  reconcileSchema,
  recordYieldsSchema,
  recurringSchema,
  searchSchema,
  settingsSchema,
  setupSchema,
  skipOccurrenceSchema,
  updateEntrySchema,
} from "./schemas";
import { loadUserState, requireAccount, requireTransaction, systemCategory, type UserState } from "./state";
import {
  buildEntryDocs,
  occurrenceToDoc,
  openingDateForInvoice,
  rebucketCardTransactions,
  type EntryInput,
  type TransactionDoc,
} from "./writes";

const log = createLogger("finance-actions");

/** Autentica, valida, executa e atualiza a tela. Erros viram mensagem para o toast. */
async function run<S extends z.ZodType, T>(
  schema: S,
  raw: unknown,
  handler: (input: z.output<S>, userId: string) => Promise<T>,
  options: { refresh?: boolean } = {},
): Promise<ActionResult<T>> {
  const session = await requireCurrentUser();
  try {
    const input = schema.parse(raw);
    await connectToDatabase();
    const data = await handler(input, session.userId);
    if (options.refresh !== false) refresh();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ZodError) return { ok: false, error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof UserError) return { ok: false, error: error.message };
    log.error("Falha na action", serializeError(error));
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }
}

const oid = (value: string) => new Types.ObjectId(value);

function toEntryInput(input: z.output<typeof entrySchema>): EntryInput {
  return { ...input };
}

/** Transferência para o cartão sem fatura escolhida: paga a fatura fechada mais antiga em aberto (ou a aberta). */
function defaultInvoiceForPayment(state: UserState, cardId: string): MonthKey | null {
  const card = state.accountsById.get(cardId);
  if (!card?.card) return null;
  const invoices = summarizeInvoices(card, state.transactions, state.today);
  const due = invoices.find(
    (invoice) => (invoice.state === "closed" || invoice.state === "overdue") && invoice.remainingCents > 0,
  );
  return due?.month ?? invoiceMonthFor(card.card, state.today);
}

function assertCategory(state: UserState, categoryId: string | null) {
  if (categoryId && !state.categories.some((category) => category.id === categoryId)) {
    throw new UserError("Categoria não encontrada.");
  }
}

async function insertDocs(docs: TransactionDoc[]) {
  const created = await Transaction.insertMany(docs);
  return created.map((doc) => String(doc._id));
}

// ——— Lançamentos ———

export async function createEntry(raw: unknown) {
  return run(entrySchema, raw, async (input, userId) => {
    const state = await loadUserState(userId);
    assertCategory(state, input.categoryId);
    const entry = toEntryInput(input);
    if (entry.type === "transfer" && entry.toAccountId && !entry.invoiceMonth) {
      entry.invoiceMonth = defaultInvoiceForPayment(state, entry.toAccountId);
    }
    const ids = await insertDocs(buildEntryDocs(userId, entry, state.accountsById));
    return { ids };
  });
}

export async function updateEntry(raw: unknown) {
  return run(updateEntrySchema, raw, async ({ id, scope, entry: rawEntry }, userId) => {
    const state = await loadUserState(userId);
    const current = requireTransaction(state, id);
    assertCategory(state, rawEntry.categoryId);
    const entry = toEntryInput(rawEntry);

    if (scope === "group" && current.installment) {
      const groupId = current.installment.groupId;
      const group = state.transactions.filter((tx) => tx.installment?.groupId === groupId);
      const totalCents = group.reduce((total, tx) => total + tx.amountCents, 0);
      const sameShape =
        entry.installments === current.installment.count &&
        entry.date === current.date &&
        entry.accountId === current.accountId &&
        !entry.invoiceMonth;
      const sameAmount =
        entry.amountMode === "installment"
          ? group.some((tx) => tx.amountCents === entry.amountCents)
          : entry.amountCents === totalCents;
      if (sameShape && sameAmount) {
        // Só texto/categoria mudou: atualiza no lugar e preserva os centavos de cada parcela.
        await Transaction.updateMany(
          { userId: oid(userId), "installment.groupId": groupId },
          {
            $set: {
              description: entry.description.trim(),
              categoryId: entry.categoryId ? oid(entry.categoryId) : null,
              notes: entry.notes,
            },
          },
        );
        return null;
      }
      // Mudou valor, parcelas, data ou cartão: refaz a compra com o mesmo grupo.
      const docs = buildEntryDocs(userId, entry, state.accountsById, { groupId });
      await Transaction.deleteMany({ userId: oid(userId), "installment.groupId": groupId });
      await insertDocs(docs);
      return null;
    }

    if (current.installment) {
      // Uma parcela isolada: muda valor, texto e categoria; a fatura e a posição continuam.
      await Transaction.updateOne(
        { _id: oid(id), userId: oid(userId) },
        {
          $set: {
            amountCents: entry.amountCents,
            description: entry.description.trim(),
            categoryId: entry.categoryId ? oid(entry.categoryId) : null,
            notes: entry.notes,
          },
        },
      );
      return null;
    }

    if (entry.type === "transfer" && entry.toAccountId && !entry.invoiceMonth) {
      const target = state.accountsById.get(entry.toAccountId);
      entry.invoiceMonth = target?.card ? (current.invoiceMonth ?? defaultInvoiceForPayment(state, target.id)) : null;
    }
    const keepLocked = current.invoiceLocked && !entry.invoiceMonth && current.accountId === entry.accountId;
    if (keepLocked) entry.invoiceMonth = current.invoiceMonth;
    entry.recurringId = current.recurringId;
    entry.recurringMonth = current.recurringMonth;
    const [doc] = buildEntryDocs(userId, { ...entry, installments: 1 }, state.accountsById);
    if (!doc) throw new UserError("Não foi possível atualizar.");
    const fields: Partial<TransactionDoc> = { ...doc };
    delete fields.userId;
    await Transaction.updateOne({ _id: oid(id), userId: oid(userId) }, { $set: fields });
    return null;
  });
}

export async function deleteEntry(raw: unknown) {
  return run(deleteEntrySchema, raw, async ({ id, scope }, userId) => {
    const state = await loadUserState(userId);
    const current = requireTransaction(state, id);
    if (current.installment && scope !== "single") {
      const filter: Record<string, unknown> = {
        userId: oid(userId),
        "installment.groupId": current.installment.groupId,
      };
      if (scope === "following") filter["installment.index"] = { $gte: current.installment.index };
      const result = await Transaction.deleteMany(filter);
      return { deleted: result.deletedCount ?? 0 };
    }
    await Transaction.deleteOne({ _id: oid(id), userId: oid(userId) });
    return { deleted: 1 };
  });
}

/** Coloca a compra em outra fatura (quando o banco lançou diferente do previsto). */
export async function moveToInvoice(raw: unknown) {
  return run(moveInvoiceSchema, raw, async ({ id, month, scope }, userId) => {
    const state = await loadUserState(userId);
    const current = requireTransaction(state, id);
    if (!current.invoiceMonth) throw new UserError("Só compras no cartão têm fatura.");
    const shift = monthDiff(current.invoiceMonth, month);
    const targets =
      scope === "group" && current.installment
        ? state.transactions.filter((tx) => tx.installment?.groupId === current.installment?.groupId)
        : [current];
    await Transaction.bulkWrite(
      targets.map((tx) => {
        const invoiceMonth = addMonths(tx.invoiceMonth ?? month, shift);
        return {
          updateOne: {
            filter: { _id: oid(tx.id), userId: oid(userId) },
            update: { $set: { invoiceMonth, competence: invoiceMonth, invoiceLocked: true } },
          },
        };
      }),
    );
    return null;
  });
}

// ——— Recorrências ———

export async function confirmOccurrence(raw: unknown) {
  return run(confirmOccurrenceSchema, raw, async ({ recurringId, month, amountCents, date }, userId) => {
    const state = await loadUserState(userId);
    const recurring = state.recurrings.find((item) => item.id === recurringId);
    if (!recurring) throw new UserError("Recorrência não encontrada.");
    const occurrence = occurrencesBetween(
      [{ ...recurring, active: true }],
      state.accounts,
      state.transactions,
      dayInMonth(month, 1),
      dayInMonth(month, 31),
    )[0];
    if (!occurrence) throw new UserError("Essa ocorrência não existe.");
    if (occurrence.posted) throw new UserError("Já foi lançada.");
    const doc = occurrenceToDoc(userId, occurrence, { amountCents, date });
    if (date) {
      const account = requireAccount(state, recurring.accountId);
      if (account.card && recurring.type === "expense") {
        doc.invoiceMonth = invoiceMonthFor(account.card, date);
      }
      doc.competence = competenceOf(doc);
    }
    const [id] = await insertDocs([doc]);
    return { id };
  });
}

export async function skipOccurrence(raw: unknown) {
  return run(skipOccurrenceSchema, raw, async ({ recurringId, month }, userId) => {
    await Recurring.updateOne({ _id: oid(recurringId), userId: oid(userId) }, { $addToSet: { skippedMonths: month } });
    return null;
  });
}

export async function unskipOccurrence(raw: unknown) {
  return run(skipOccurrenceSchema, raw, async ({ recurringId, month }, userId) => {
    await Recurring.updateOne({ _id: oid(recurringId), userId: oid(userId) }, { $pull: { skippedMonths: month } });
    return null;
  });
}

export async function saveRecurring(raw: unknown) {
  return run(recurringSchema, raw, async ({ id, ...input }, userId) => {
    const state = await loadUserState(userId);
    requireAccount(state, input.accountId);
    assertCategory(state, input.categoryId);
    const suggested = suggestedStartMonth(state.today, input.dayOfMonth);
    let startMonth = input.startMonth ?? suggested;
    const current = id ? state.recurrings.find((item) => item.id === id) : undefined;
    // Retomar uma fixa pausada não cobra os meses em que ela ficou parada.
    if (current && !current.active && input.active && startMonth < suggested) startMonth = suggested;
    const fields = {
      ...input,
      accountId: oid(input.accountId),
      categoryId: input.categoryId ? oid(input.categoryId) : null,
      monthOfYear: input.frequency === "yearly" ? (input.monthOfYear ?? Number(state.today.slice(5, 7))) : null,
      startMonth,
    };
    if (id) {
      await Recurring.updateOne({ _id: oid(id), userId: oid(userId) }, { $set: fields });
      return { id };
    }
    const created = await Recurring.create({ ...fields, userId: oid(userId) });
    return { id: String(created._id) };
  });
}

export async function deleteRecurring(raw: unknown) {
  return run(idSchema, raw, async ({ id }, userId) => {
    // Lançamentos já confirmados ficam (são histórico); só a regra some.
    await Recurring.deleteOne({ _id: oid(id), userId: oid(userId) });
    return null;
  });
}

// ——— Contas, cofrinhos e cartões ———

export async function saveAccount(raw: unknown) {
  return run(accountSchema, raw, async ({ id, balanceCents, card, goal, ...input }, userId) => {
    const state = await loadUserState(userId);
    if (card?.reserveAccountId) requireAccount(state, card.reserveAccountId);
    const cardFields =
      input.kind === "credit_card"
        ? {
            closingDay: card?.closingDay ?? 28,
            dueDay: card?.dueDay ?? 5,
            limitCents: card?.limitCents ?? null,
            reserveAccountId: card?.reserveAccountId ? oid(card.reserveAccountId) : null,
          }
        : null;
    const goalFields = input.purpose === "goal" && goal ? goal : null;

    if (id) {
      const current = requireAccount(state, id);
      const set: Record<string, unknown> = { ...input, goal: goalFields };
      if (cardFields) {
        set.card = { ...cardFields, cycleOverrides: current.card?.cycleOverrides ?? [] };
      } else {
        set.card = null;
      }
      if (balanceCents !== undefined && input.kind !== "credit_card") {
        const balances = balancesByAccount(state.accounts, state.transactions);
        const delta = balanceCents - (balances.get(id) ?? 0);
        set.openingBalanceCents = current.openingBalanceCents + delta;
      }
      await Account.updateOne({ _id: oid(id), userId: oid(userId) }, { $set: set });

      if (cardFields && current.card) {
        const updated = { ...current, card: { ...current.card, ...cardFields, reserveAccountId: card?.reserveAccountId ?? null } };
        await applyRebucket(userId, updated, state);
      }
      return { id };
    }

    const created = await Account.create({
      ...input,
      userId: oid(userId),
      openingBalanceCents: input.kind === "credit_card" ? 0 : (balanceCents ?? 0),
      openingDate: state.today,
      card: cardFields ? { ...cardFields, cycleOverrides: [] } : null,
      goal: goalFields,
      sortOrder: state.accounts.length,
      lastReconciledAt: balanceCents !== undefined ? state.today : null,
    });
    return { id: String(created._id) };
  });
}

async function applyRebucket(userId: string, card: UserState["accounts"][number], state: UserState) {
  const changes = rebucketCardTransactions(card, state.transactions);
  if (!changes.length) return;
  await Transaction.bulkWrite(
    changes.map((change) => ({
      updateOne: {
        filter: { _id: oid(change.id), userId: oid(userId) },
        update: { $set: { invoiceMonth: change.invoiceMonth, competence: change.invoiceMonth } },
      },
    })),
  );
}

export async function setAccountArchived(raw: unknown) {
  return run(archiveSchema, raw, async ({ id, archived }, userId) => {
    await Account.updateOne({ _id: oid(id), userId: oid(userId) }, { $set: { archived } });
    return null;
  });
}

/** Só apaga conta sem lançamentos; com histórico, o caminho é arquivar. */
export async function deleteAccount(raw: unknown) {
  return run(idSchema, raw, async ({ id }, userId) => {
    const state = await loadUserState(userId);
    requireAccount(state, id);
    const used = state.transactions.some((tx) => tx.accountId === id || tx.toAccountId === id);
    if (used) throw new UserError("Essa conta tem lançamentos. Arquive em vez de apagar.");
    if (state.recurrings.some((item) => item.accountId === id)) {
      throw new UserError("Há recorrências usando essa conta. Troque a conta delas antes.");
    }
    await Account.updateMany(
      { userId: oid(userId), "card.reserveAccountId": oid(id) },
      { $set: { "card.reserveAccountId": null } },
    );
    await Account.deleteOne({ _id: oid(id), userId: oid(userId) });
    return null;
  });
}

/**
 * Confere saldos com os apps: a diferença vira "Rendimento" (conta que rende e sobrou dinheiro)
 * ou "Ajuste de saldo". Marca a conferência em todas as contas informadas.
 */
export async function reconcileAccounts(raw: unknown) {
  return run(reconcileSchema, raw, async ({ items }, userId) => {
    const state = await loadUserState(userId);
    const balances = balancesByAccount(state.accounts, state.transactions);
    const docs: TransactionDoc[] = [];
    for (const item of items) {
      const account = requireAccount(state, item.accountId);
      if (account.kind === "credit_card") continue;
      const diff = item.realBalanceCents - (balances.get(account.id) ?? 0);
      if (diff === 0) continue;
      const isYield = diff > 0 && Boolean(account.yieldCdiPct);
      const category = isYield
        ? systemCategory(state, "yield", "income")
        : systemCategory(state, "adjustment", diff > 0 ? "income" : "expense");
      docs.push({
        userId: oid(userId),
        type: diff > 0 ? "income" : "expense",
        amountCents: Math.abs(diff),
        description: isYield ? "Rendimento" : "Ajuste de saldo",
        categoryId: category ? oid(category.id) : null,
        accountId: oid(account.id),
        toAccountId: null,
        date: state.today,
        competence: monthOf(state.today),
        method: null,
        invoiceMonth: null,
        invoiceLocked: false,
        installment: null,
        recurringId: null,
        recurringMonth: null,
        notes: "Conferência de saldo",
      });
    }
    if (docs.length) await Transaction.insertMany(docs);
    await Account.updateMany(
      { userId: oid(userId), _id: { $in: items.map((item) => oid(item.accountId)) } },
      { $set: { lastReconciledAt: state.today } },
    );
    return { adjustments: docs.length };
  });
}

/** Lança o rendimento do mês de cada cofre/conta (categoria Rendimentos). */
export async function recordYields(raw: unknown) {
  return run(recordYieldsSchema, raw, async ({ month, items }, userId) => {
    const state = await loadUserState(userId);
    const category = systemCategory(state, "yield", "income");
    const currentMonth = monthOf(state.today);
    if (month > currentMonth) throw new UserError("Esse mês ainda não começou.");
    // Mês fechado: último dia dele; mês atual: hoje.
    const date = month === currentMonth ? state.today : dayInMonth(month, 31);
    const docs: TransactionDoc[] = items.map((item) => {
      const account = requireAccount(state, item.accountId);
      if (account.kind === "credit_card") throw new UserError("Cartão não rende.");
      return {
        userId: oid(userId),
        type: "income",
        amountCents: item.amountCents,
        description: "Rendimento",
        categoryId: category ? oid(category.id) : null,
        accountId: oid(account.id),
        toAccountId: null,
        date,
        competence: month,
        method: null,
        invoiceMonth: null,
        invoiceLocked: false,
        installment: null,
        recurringId: null,
        recurringMonth: null,
        notes: "Rendimento do mês",
      };
    });
    await Transaction.insertMany(docs);
    return { created: docs.length, totalCents: items.reduce((total, item) => total + item.amountCents, 0) };
  });
}

/** Acerta o total de uma fatura com o que o banco mostra. */
export async function reconcileInvoice(raw: unknown) {
  return run(reconcileInvoiceSchema, raw, async ({ cardId, month, realTotalCents }, userId) => {
    const state = await loadUserState(userId);
    const card = requireAccount(state, cardId);
    if (!card.card) throw new UserError("Conta não é um cartão.");
    const invoice = summarizeInvoices(card, state.transactions, state.today).find((item) => item.month === month);
    const diff = realTotalCents - (invoice?.totalCents ?? 0);
    if (diff === 0) return { adjusted: false };
    const category = systemCategory(state, "adjustment", "expense");
    await Transaction.create({
      userId: oid(userId),
      type: diff > 0 ? "expense" : "refund",
      amountCents: Math.abs(diff),
      description: "Ajuste da fatura",
      categoryId: category ? oid(category.id) : null,
      accountId: oid(card.id),
      date: openingDateForInvoice(card, month, state.today),
      competence: month,
      method: "credit",
      invoiceMonth: month,
      invoiceLocked: true,
      notes: "Conferência com o app do banco",
    });
    return { adjusted: true };
  });
}

/** Ajusta fechamento/vencimento de uma fatura específica e reposiciona as compras afetadas. */
export async function setInvoiceDates(raw: unknown) {
  return run(invoiceDatesSchema, raw, async ({ cardId, month, closingDate, dueDate }, userId) => {
    if (dueDate <= closingDate) throw new UserError("O vencimento precisa ser depois do fechamento.");
    const state = await loadUserState(userId);
    const card = requireAccount(state, cardId);
    if (!card.card) throw new UserError("Conta não é um cartão.");
    const cycleOverrides = [
      ...card.card.cycleOverrides.filter((item) => item.month !== month),
      { month, closingDate, dueDate },
    ].sort((a, b) => (a.month < b.month ? -1 : 1));
    await Account.updateOne({ _id: oid(cardId), userId: oid(userId) }, { $set: { "card.cycleOverrides": cycleOverrides } });
    await applyRebucket(userId, { ...card, card: { ...card.card, cycleOverrides } }, state);
    return null;
  });
}

/** Parcelamento que já existia antes do app: gera só as parcelas que faltam depois da fatura aberta. */
export async function addOngoingInstallments(raw: unknown) {
  return run(ongoingInstallmentsSchema, raw, async (input, userId) => {
    if (input.currentIndex >= input.count) throw new UserError("A parcela atual já é a última — nada a gerar.");
    const state = await loadUserState(userId);
    assertCategory(state, input.categoryId);
    const card = requireAccount(state, input.cardId);
    if (!card.card) throw new UserError("Escolha um cartão de crédito.");
    const ids = await insertDocs(ongoingDocs(userId, card, state.today, input));
    return { created: ids.length };
  });
}

function ongoingDocs(
  userId: string,
  card: UserState["accounts"][number],
  today: string,
  input: { description: string; categoryId: string | null; installmentCents: number; currentIndex: number; count: number },
): TransactionDoc[] {
  if (!card.card) return [];
  const openMonth = invoiceMonthFor(card.card, today);
  const groupId = new Types.ObjectId().toString();
  const purchaseDate = dayInMonth(addMonths(openMonth, -(input.currentIndex - 1)), 1);
  return planOngoingInstallments(openMonth, input.installmentCents, input.currentIndex, input.count).map((item) => ({
    userId: oid(userId),
    type: "expense",
    amountCents: item.amountCents,
    description: input.description.trim(),
    categoryId: input.categoryId ? oid(input.categoryId) : null,
    accountId: oid(card.id),
    toAccountId: null,
    date: purchaseDate,
    competence: item.invoiceMonth,
    method: "credit",
    invoiceMonth: item.invoiceMonth,
    invoiceLocked: true,
    installment: { groupId, index: item.index, count: item.count },
    recurringId: null,
    recurringMonth: null,
    notes: "Parcelamento anterior ao app",
  }));
}

/**
 * Importa linhas revisadas da fatura do Nubank. Cada linha fica presa à fatura escolhida;
 * "Parcela k/n" gera a parcela k nesta fatura e as seguintes nas próximas.
 */
export async function importCardInvoice(raw: unknown) {
  return run(importCardSchema, raw, async ({ cardId, month, rows }, userId) => {
    const state = await loadUserState(userId);
    const card = requireAccount(state, cardId);
    if (!card.card) throw new UserError("Escolha um cartão de crédito.");
    for (const row of rows) assertCategory(state, row.categoryId);
    const docs: TransactionDoc[] = [];
    for (const row of rows) {
      const base = {
        userId: oid(userId),
        description: row.description,
        categoryId: row.categoryId ? oid(row.categoryId) : null,
        accountId: oid(card.id),
        toAccountId: null,
        date: row.date,
        method: "credit" as const,
        invoiceLocked: true,
        recurringId: null,
        recurringMonth: null,
        notes: "Importado da fatura",
      };
      if (row.installment && row.kind === "charge") {
        const groupId = new Types.ObjectId().toString();
        for (let index = row.installment.index; index <= row.installment.count; index += 1) {
          const invoiceMonth = addMonths(month, index - row.installment.index);
          docs.push({
            ...base,
            type: "expense",
            amountCents: row.amountCents,
            invoiceMonth,
            competence: invoiceMonth,
            installment: { groupId, index, count: row.installment.count },
          });
        }
        continue;
      }
      docs.push({
        ...base,
        type: row.kind === "refund" ? "refund" : "expense",
        amountCents: row.amountCents,
        invoiceMonth: month,
        competence: month,
        installment: null,
      });
    }
    const ids = await insertDocs(docs);
    return { created: ids.length };
  });
}

// ——— Categorias e preferências ———

export async function saveCategory(raw: unknown) {
  return run(categorySchema, raw, async ({ id, ...input }, userId) => {
    if (id) {
      await Category.updateOne({ _id: oid(id), userId: oid(userId) }, { $set: input });
      return { id };
    }
    const count = await Category.countDocuments({ userId: oid(userId) });
    const created = await Category.create({ ...input, userId: oid(userId), sortOrder: count });
    return { id: String(created._id) };
  });
}

export async function setCategoryArchived(raw: unknown) {
  return run(archiveSchema, raw, async ({ id, archived }, userId) => {
    await Category.updateOne({ _id: oid(id), userId: oid(userId), systemKey: null }, { $set: { archived } });
    return null;
  });
}

export async function updateSettings(raw: unknown) {
  return run(settingsSchema, raw, async (input, userId) => {
    await User.updateOne({ _id: oid(userId) }, { $set: input });
    return null;
  });
}

// ——— Configuração inicial ———

/**
 * Monta o cenário de uma vez: contas e cofres com saldo de hoje, cartão com faturas em aberto,
 * parcelamentos em andamento e recorrências.
 */
export async function completeSetup(raw: unknown) {
  return run(setupSchema, raw, async (input, userId) => {
    const state = await loadUserState(userId);
    if (state.accounts.length) throw new UserError("A configuração inicial já foi feita.");
    for (const item of [...input.installments, ...input.recurrings]) assertCategory(state, item.categoryId);
    const owner = oid(userId);
    const idsByKey = new Map<string, Types.ObjectId>();
    for (const account of input.accounts) idsByKey.set(account.key, new Types.ObjectId());

    const accountDocs = input.accounts.map((account, index) => ({
      _id: idsByKey.get(account.key),
      userId: owner,
      name: account.name,
      institution: account.institution,
      kind: account.kind,
      purpose: account.purpose,
      color: account.color,
      yieldCdiPct: account.yieldCdiPct,
      openingBalanceCents: account.kind === "credit_card" ? 0 : account.balanceCents,
      openingDate: state.today,
      sortOrder: index,
      lastReconciledAt: state.today,
      card: account.card
        ? {
            closingDay: account.card.closingDay,
            dueDay: account.card.dueDay,
            limitCents: account.card.limitCents,
            reserveAccountId: account.card.reserveKey ? (idsByKey.get(account.card.reserveKey) ?? null) : null,
            cycleOverrides: [],
          }
        : null,
      goal: account.purpose === "goal" ? account.goal : null,
    }));
    await Account.insertMany(accountDocs);

    const fresh = await loadUserState(userId);
    const opening = systemCategory(fresh, "opening", "expense");
    const docs: TransactionDoc[] = [];

    for (const account of input.accounts) {
      if (!account.card) continue;
      const card = fresh.accountsById.get(String(idsByKey.get(account.key)));
      if (!card?.card) continue;
      const openMonth = invoiceMonthFor(card.card, fresh.today);
      const chargeFor = (month: MonthKey, amountCents: number, description: string): TransactionDoc => ({
        userId: owner,
        type: "expense",
        amountCents,
        description,
        categoryId: opening ? oid(opening.id) : null,
        accountId: oid(card.id),
        toAccountId: null,
        date: openingDateForInvoice(card, month, state.today),
        competence: month,
        method: "credit",
        invoiceMonth: month,
        invoiceLocked: true,
        installment: null,
        recurringId: null,
        recurringMonth: null,
        notes: "Valor que já estava na fatura quando o app começou",
      });
      if (account.card.closedUnpaidCents > 0) {
        docs.push(chargeFor(addMonths(openMonth, -1), account.card.closedUnpaidCents, "Fatura fechada (antes do app)"));
      }
      if (account.card.openCents > 0) {
        docs.push(chargeFor(openMonth, account.card.openCents, "Fatura aberta (antes do app)"));
      }
      for (const installment of input.installments.filter((item) => item.cardKey === account.key)) {
        if (installment.currentIndex >= installment.count) continue;
        docs.push(...ongoingDocs(userId, card, fresh.today, installment));
      }
    }
    if (docs.length) await Transaction.insertMany(docs);

    if (input.recurrings.length) {
      await Recurring.insertMany(
        input.recurrings
          .filter((item) => idsByKey.has(item.accountKey))
          .map((item) => {
            const account = input.accounts.find((candidate) => candidate.key === item.accountKey);
            return {
              userId: owner,
              type: item.type,
              description: item.description,
              amountCents: item.amountCents,
              isEstimate: item.isEstimate,
              categoryId: item.categoryId ? oid(item.categoryId) : null,
              accountId: idsByKey.get(item.accountKey),
              method: account?.kind === "credit_card" ? "credit" : item.type === "expense" ? "pix" : null,
              frequency: "monthly",
              dayOfMonth: item.dayOfMonth,
              // Fora do cartão começa já neste mês: o que venceu antes do app vira "confirme" e entra no
              // plano sem mexer no saldo (data anterior ao saldo inicial). No cartão, a cobrança deste mês
              // já está no valor da fatura aberta informado.
              startMonth:
                account?.kind === "credit_card"
                  ? suggestedStartMonth(fresh.today, item.dayOfMonth)
                  : monthOf(fresh.today),
              autoPost: item.autoPost,
            };
          }),
      );
    }

    await User.updateOne(
      { _id: owner },
      { $set: { setupCompletedAt: new Date(), ...(input.cdiAnnualPct !== null ? { cdiAnnualPct: input.cdiAnnualPct } : {}) } },
    );
    return null;
  });
}

// ——— Busca ———

export type SearchHit = {
  kind: "transaction" | "account" | "category" | "recurring";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  amountCents?: number;
  date?: string;
};

export async function searchFinance(raw: unknown) {
  return run(searchSchema, raw, async ({ query }, userId) => {
    const state = await loadUserState(userId);
    const needle = normalizeDescription(query);
    // "42,90" busca pelo valor; texto busca pela descrição (normalizar remove dígitos).
    const amount = /\d/.test(query) ? parseMoneyInput(query) : null;
    const matches = (text: string) => Boolean(needle) && normalizeDescription(text).includes(needle);
    const hits: SearchHit[] = [];
    const accountName = (id: string) => state.accountsById.get(id)?.name ?? "";

    for (const account of state.accounts.filter((item) => matches(item.name)).slice(0, 5)) {
      hits.push({
        kind: "account",
        id: account.id,
        title: account.name,
        subtitle: account.card ? "Cartão" : "Conta",
        href: account.card ? `/cards/${account.id}` : "/accounts",
      });
    }
    for (const category of state.categories.filter((item) => !item.archived && matches(item.name)).slice(0, 5)) {
      hits.push({
        kind: "category",
        id: category.id,
        title: category.name,
        subtitle: "Categoria",
        href: `/transactions?category=${category.id}&month=all`,
      });
    }
    for (const recurring of state.recurrings.filter((item) => matches(item.description)).slice(0, 5)) {
      hits.push({ kind: "recurring", id: recurring.id, title: recurring.description, subtitle: "Fixa", href: "/recurring" });
    }
    const transactions = [...state.transactions]
      .filter((tx) => matches(tx.description) || (amount !== null && !needle && tx.amountCents === amount))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 20);
    for (const tx of transactions as TransactionType[]) {
      hits.push({
        kind: "transaction",
        id: tx.id,
        title: tx.installment ? `${tx.description} · ${tx.installment.index}/${tx.installment.count}` : tx.description,
        subtitle: accountName(tx.accountId),
        href: `/transactions?month=${tx.competence}&q=${encodeURIComponent(tx.description)}`,
        amountCents:
          tx.type === "transfer" ? undefined : tx.type === "expense" ? -tx.amountCents : tx.amountCents,
        date: tx.date,
      });
    }
    return hits;
  }, { refresh: false });
}
