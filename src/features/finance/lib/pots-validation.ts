import { Types } from "mongoose";
import { syncAvailableBalance } from "@/features/finance/lib/ledger";
import { BankAccount } from "@/models/BankAccount";
import { SavingsPot } from "@/models/SavingsPot";

export class PotAllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PotAllocationError";
  }
}

async function sumPotsForAccount(userId: string, accountId: string, excludePotId?: string) {
  const uid = new Types.ObjectId(userId);
  const aid = new Types.ObjectId(accountId);
  const match: Record<string, unknown> = { userId: uid, bankAccountId: aid };
  if (excludePotId) {
    match._id = { $ne: new Types.ObjectId(excludePotId) };
  }
  const rows = await SavingsPot.aggregate<{ s: number }>([
    { $match: match },
    { $group: { _id: null, s: { $sum: "$currentAmount" } } },
  ]);
  return rows[0]?.s ?? 0;
}

/** Garante que soma(currentAmount dos cofrinhos da conta) <= saldo da conta. */
export async function assertPotsWithinBalance(
  userId: string,
  accountId: string,
  excludePotId?: string,
) {
  const acc = await BankAccount.findOne({
    _id: accountId,
    userId,
    isArchived: false,
  });
  if (!acc) throw new PotAllocationError("Conta não encontrada.");
  const sum = await sumPotsForAccount(userId, accountId, excludePotId);
  if (sum > Number(acc.balance) + 1e-9) {
    throw new PotAllocationError(
      "A soma dos cofrinhos não pode exceder o saldo total da conta.",
    );
  }
}

export async function refreshAccountAfterPotChange(userId: string, accountId: string) {
  await assertPotsWithinBalance(userId, accountId);
  await syncAvailableBalance(userId, accountId);
}
