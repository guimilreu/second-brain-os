import { Types } from "mongoose";
import { BankAccount } from "@/models/BankAccount";
import { SavingsPot } from "@/models/SavingsPot";
import { Transaction } from "@/models/Transaction";

/** Soma líquida de transações confirmadas que entram no saldo da conta. */
export async function aggregateConfirmedNet(userId: string, accountId: string) {
  const uid = new Types.ObjectId(userId);
  const aid = new Types.ObjectId(accountId);
  const rows = await Transaction.aggregate<{ net: number }>([
    {
      $match: {
        userId: uid,
        bankAccountId: aid,
        status: "confirmed",
        $or: [{ includeInAccountBalance: true }, { includeInAccountBalance: { $exists: false } }],
      },
    },
    {
      $group: {
        _id: null,
        net: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", { $multiply: ["$amount", -1] }],
          },
        },
      },
    },
  ]);
  return rows[0]?.net ?? 0;
}

export async function syncAvailableBalance(userId: string, accountId: string) {
  const acc = await BankAccount.findOne({ _id: accountId, userId, isArchived: false });
  if (!acc) return;
  const pots = await SavingsPot.find({ userId, bankAccountId: accountId });
  const allocated = pots.reduce((s, p) => s + Number(p.currentAmount ?? 0), 0);
  const available = Math.max(0, Number(acc.balance) - allocated);
  await BankAccount.updateOne({ _id: accountId }, { $set: { availableBalance: available } });
}

/**
 * Recalcula `balance = openingBalance + soma(lançamentos confirmados)`.
 * Se `openingBalance` ainda não existia no documento, deriva uma vez a partir do saldo atual.
 */
export async function recalculateAccountBalance(userId: string, accountId: string) {
  const account = await BankAccount.findOne({
    _id: accountId,
    userId,
    isArchived: false,
  });
  if (!account) return;

  const net = await aggregateConfirmedNet(userId, accountId);
  let opening =
    account.openingBalance !== undefined && account.openingBalance !== null
      ? Number(account.openingBalance)
      : Number(account.balance ?? 0) - net;

  if (!Number.isFinite(opening)) opening = 0;

  const newBalance = opening + net;
  await BankAccount.updateOne(
    { _id: account._id },
    { $set: { openingBalance: opening, balance: newBalance } },
  );
  await syncAvailableBalance(userId, accountId);
}

export async function recalculateAccountBalancesTouching(
  userId: string,
  bankAccountId: string | null | undefined,
  previousBankAccountId?: string | null,
) {
  const ids = new Set<string>();
  if (bankAccountId) ids.add(String(bankAccountId));
  if (previousBankAccountId) ids.add(String(previousBankAccountId));
  await Promise.all([...ids].map((id) => recalculateAccountBalance(userId, id)));
}
