import mongoose from "mongoose";
import { BankAccount } from "@/models/BankAccount";
import { CreditCardInvoice } from "@/models/CreditCardInvoice";
import { SavingsPot } from "@/models/SavingsPot";
import { Transaction } from "@/models/Transaction";
import { Transfer } from "@/models/Transfer";
import { recalculateAccountBalance, syncAvailableBalance } from "@/features/finance/lib/ledger";
import { z } from "zod";
import { transferCreateSchema } from "@/features/finance/lib/schemas";

export type TransferCreateInput = z.infer<typeof transferCreateSchema>;

export class TransferError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.name = "TransferError";
    this.status = status;
  }
}

async function assertAccount(userId: string, id: string) {
  const a = await BankAccount.findOne({ _id: id, userId, isArchived: false });
  if (!a) throw new TransferError("Conta não encontrada.", 404);
  return a;
}

async function assertPot(userId: string, id: string) {
  const p = await SavingsPot.findOne({ _id: id, userId });
  if (!p) throw new TransferError("Cofrinho não encontrado.", 404);
  return p;
}

async function getAvailableForAccount(userId: string, accountId: string) {
  const acc = await assertAccount(userId, accountId);
  const pots = await SavingsPot.find({ userId, bankAccountId: accountId });
  const allocated = pots.reduce((s, p) => s + Number(p.currentAmount ?? 0), 0);
  return Math.max(0, Number(acc.balance) - allocated);
}

async function accountToAccount(
  userId: string,
  input: TransferCreateInput,
  options?: { recordKind?: TransferCreateInput["kind"] },
) {
  const fromId = input.fromAccountId as string;
  const toId = input.toAccountId as string;
  if (fromId === toId) throw new TransferError("Origem e destino não podem ser iguais.");

  const [fromAcc, toAcc] = await Promise.all([
    assertAccount(userId, fromId),
    assertAccount(userId, toId),
  ]);

  const totalOut = input.amount + (input.fee ?? 0);
  if (fromAcc.type === "credit") {
    throw new TransferError("Use o fluxo de fatura para movimentar cartão de crédito.");
  }
  const available = await getAvailableForAccount(userId, fromId);
  if (available < totalOut) {
    throw new TransferError(
      "Saldo livre insuficiente (considere retirar de cofrinhos ou reduzir reservas).",
    );
  }

  const transferKind = options?.recordKind ?? input.kind;

  const session = await mongoose.startSession();
  let expenseId!: mongoose.Types.ObjectId;
  let incomeId!: mongoose.Types.ObjectId;
  let transferId!: mongoose.Types.ObjectId;

  try {
    await session.withTransaction(async () => {
      const transferDocs = await Transfer.create(
        [
          {
            userId,
            kind: transferKind,
            fromAccountId: fromId,
            toAccountId: toId,
            amount: input.amount,
            fee: input.fee ?? 0,
            occurredAt: input.occurredAt,
            notes: input.notes ?? "",
            status: input.status ?? "confirmed",
          },
        ],
        { session },
      );
      const transfer = transferDocs[0];
      transferId = transfer._id as mongoose.Types.ObjectId;

      const base = {
        userId,
        category: "Transferência",
        status: input.status ?? "confirmed",
        occurredAt: input.occurredAt,
        transferId: transfer._id,
        paymentMethod: "internal" as const,
        includeInAccountBalance: true,
        notes: input.notes ?? "",
      };

      const expenseDocs = await Transaction.create(
        [
          {
            ...base,
            bankAccountId: fromId,
            type: "expense",
            title: `Para ${toAcc.name}`,
            amount: totalOut,
          },
        ],
        { session },
      );
      expenseId = expenseDocs[0]._id as mongoose.Types.ObjectId;

      const incomeDocs = await Transaction.create(
        [
          {
            ...base,
            bankAccountId: toId,
            type: "income",
            title: `De ${fromAcc.name}`,
            amount: input.amount,
          },
        ],
        { session },
      );
      incomeId = incomeDocs[0]._id as mongoose.Types.ObjectId;

      await Transfer.updateOne(
        { _id: transfer._id },
        {
          $set: {
            expenseTransactionId: expenseDocs[0]._id,
            incomeTransactionId: incomeDocs[0]._id,
          },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  await recalculateAccountBalance(userId, fromId);
  await recalculateAccountBalance(userId, toId);

  const transfer = await Transfer.findById(transferId).lean();
  return { transfer, expenseTransactionId: expenseId, incomeTransactionId: incomeId };
}

async function accountToPot(userId: string, input: TransferCreateInput) {
  const fromId = input.fromAccountId as string;
  const potId = input.toPotId as string;
  const pot = await assertPot(userId, potId);
  const fromAccountId = String(pot.bankAccountId ?? "");
  if (!pot.bankAccountId || fromAccountId !== fromId) {
    throw new TransferError("O cofrinho precisa pertencer à conta de origem.");
  }
  const available = await getAvailableForAccount(userId, fromId);
  if (available < input.amount) {
    throw new TransferError("Saldo livre insuficiente para aportar no cofrinho.");
  }
  await SavingsPot.updateOne({ _id: potId }, { $inc: { currentAmount: input.amount } });
  await Transfer.create({
    userId,
    kind: input.kind,
    fromAccountId: fromId,
    toPotId: potId,
    amount: input.amount,
    fee: input.fee ?? 0,
    occurredAt: input.occurredAt,
    notes: input.notes ?? "",
    status: input.status ?? "confirmed",
  });
  await syncAvailableBalance(userId, fromId);
  const transfer = await Transfer.findOne({ userId }).sort({ createdAt: -1 }).lean();
  return { transfer };
}

async function potToAccount(userId: string, input: TransferCreateInput) {
  const potId = input.fromPotId as string;
  const toId = input.toAccountId as string;
  const pot = await assertPot(userId, potId);
  if (!pot.bankAccountId || String(pot.bankAccountId) !== toId) {
    throw new TransferError("O destino precisa ser a conta deste cofrinho.");
  }
  if (Number(pot.currentAmount) < input.amount) {
    throw new TransferError("Valor no cofrinho insuficiente.");
  }
  await SavingsPot.updateOne({ _id: potId }, { $inc: { currentAmount: -input.amount } });
  await Transfer.create({
    userId,
    kind: input.kind,
    fromPotId: potId,
    toAccountId: toId,
    amount: input.amount,
    fee: input.fee ?? 0,
    occurredAt: input.occurredAt,
    notes: input.notes ?? "",
    status: input.status ?? "confirmed",
  });
  await syncAvailableBalance(userId, toId);
  const transfer = await Transfer.findOne({ userId }).sort({ createdAt: -1 }).lean();
  return { transfer };
}

async function potToPot(userId: string, input: TransferCreateInput) {
  const fromPotId = input.fromPotId as string;
  const toPotId = input.toPotId as string;
  const [fromPot, toPot] = await Promise.all([
    assertPot(userId, fromPotId),
    assertPot(userId, toPotId),
  ]);
  if (!fromPot.bankAccountId || String(fromPot.bankAccountId) !== String(toPot.bankAccountId)) {
    throw new TransferError("Cofrinhos precisam estar na mesma conta.");
  }
  if (Number(fromPot.currentAmount) < input.amount) {
    throw new TransferError("Valor no cofrinho de origem insuficiente.");
  }
  await SavingsPot.updateOne({ _id: fromPotId }, { $inc: { currentAmount: -input.amount } });
  await SavingsPot.updateOne({ _id: toPotId }, { $inc: { currentAmount: input.amount } });
  await Transfer.create({
    userId,
    kind: input.kind,
    fromPotId,
    toPotId,
    amount: input.amount,
    occurredAt: input.occurredAt,
    notes: input.notes ?? "",
    status: input.status ?? "confirmed",
  });
  await syncAvailableBalance(userId, String(fromPot.bankAccountId));
  const transfer = await Transfer.findOne({ userId }).sort({ createdAt: -1 }).lean();
  return { transfer };
}

async function invoicePayment(userId: string, input: TransferCreateInput) {
  const fromId = input.fromAccountId as string;
  const invoiceId = input.creditCardInvoiceId as string;
  await assertAccount(userId, fromId);

  const invoice = await CreditCardInvoice.findOne({ _id: invoiceId, userId });
  if (!invoice) throw new TransferError("Fatura não encontrada.", 404);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const transferDocs = await Transfer.create(
        [
          {
            userId,
            kind: "invoice-payment",
            fromAccountId: fromId,
            creditCardInvoiceId: invoice._id,
            amount: input.amount,
            occurredAt: input.occurredAt,
            notes: input.notes ?? "",
            status: input.status ?? "confirmed",
          },
        ],
        { session },
      );
      const transfer = transferDocs[0];

      await Transaction.create(
        [
          {
            userId,
            bankAccountId: fromId,
            type: "expense",
            category: "Transferência",
            title: `Pagamento fatura cartão`,
            amount: input.amount,
            status: "confirmed",
            occurredAt: input.occurredAt,
            transferId: transfer._id,
            paymentMethod: "internal",
            includeInAccountBalance: true,
            notes: input.notes ?? "",
          },
        ],
        { session },
      );

      const newPaid = Number(invoice.paidAmount) + input.amount;
      const total = Number(invoice.total);
      let status = invoice.status as string;
      if (newPaid >= total && total > 0) status = "paid";
      else if (newPaid > 0) status = "partial";

      await CreditCardInvoice.updateOne(
        { _id: invoice._id },
        { $set: { paidAmount: newPaid, status } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  await recalculateAccountBalance(userId, fromId);
  const transfer = await Transfer.findOne({ userId, kind: "invoice-payment" })
    .sort({ createdAt: -1 })
    .lean();
  return { transfer };
}

/** investimento = transferência real entre contas */
async function investmentMove(userId: string, input: TransferCreateInput) {
  return accountToAccount(userId, { ...input, kind: "account-to-account" }, {
    recordKind: input.kind,
  });
}

export async function executeTransfer(userId: string, input: TransferCreateInput) {
  switch (input.kind) {
    case "account-to-account":
      return accountToAccount(userId, input);
    case "account-to-pot":
      return accountToPot(userId, input);
    case "pot-to-account":
      return potToAccount(userId, input);
    case "pot-to-pot":
      return potToPot(userId, input);
    case "invoice-payment":
      return invoicePayment(userId, input);
    case "investment-deposit":
    case "investment-withdraw":
      return investmentMove(userId, input);
    default:
      throw new TransferError("Tipo de transferência não suportado.");
  }
}
