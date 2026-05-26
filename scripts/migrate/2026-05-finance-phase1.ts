/**
 * Migração one-off: alinhar openingBalance + pots sem bankAccountId.
 * Uso: npx tsx scripts/migrate/2026-05-finance-phase1.ts
 * Requer MONGODB_URI no ambiente.
 */
import { connectToDatabase } from "../../src/lib/db/mongodb";
import { BankAccount } from "../../src/models/BankAccount";
import { SavingsPot } from "../../src/models/SavingsPot";
import { Transaction } from "../../src/models/Transaction";
import { Types } from "mongoose";

async function netFromTransactions(userId: Types.ObjectId, accountId: Types.ObjectId) {
  const rows = await Transaction.aggregate<{ net: number }>([
    {
      $match: {
        userId,
        bankAccountId: accountId,
        status: "confirmed",
        $or: [{ includeInAccountBalance: true }, { includeInAccountBalance: { $exists: false } }],
        type: { $in: ["income", "expense"] },
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

async function main() {
  await connectToDatabase();

  const accounts = await BankAccount.find({ isArchived: false });
  for (const acc of accounts) {
    const uid = acc.userId as Types.ObjectId;
    const aid = acc._id as Types.ObjectId;
    const net = await netFromTransactions(uid, aid);
    const opening =
      acc.openingBalance !== undefined && acc.openingBalance !== null
        ? Number(acc.openingBalance)
        : Number(acc.balance ?? 0) - net;
    await BankAccount.updateOne(
      { _id: acc._id },
      {
        $set: {
          openingBalance: opening,
          balance: opening + net,
          availableBalance: Number(acc.availableBalance ?? acc.balance ?? 0),
        },
      },
    );
  }

  const pots = await SavingsPot.find({
    $or: [{ bankAccountId: { $exists: false } }, { bankAccountId: null }],
  });
  for (const pot of pots) {
    const first = await BankAccount.findOne({
      userId: pot.userId,
      isArchived: false,
    }).sort({ createdAt: 1 });
    if (first) {
      await SavingsPot.updateOne({ _id: pot._id }, { $set: { bankAccountId: first._id } });
    }
  }

  for (const acc of await BankAccount.find({ isArchived: false })) {
    const sumPots = await SavingsPot.aggregate<{ s: number }>([
      { $match: { userId: acc.userId, bankAccountId: acc._id } },
      { $group: { _id: null, s: { $sum: "$currentAmount" } } },
    ]);
    const allocated = sumPots[0]?.s ?? 0;
    await BankAccount.updateOne(
      { _id: acc._id },
      { $set: { availableBalance: Math.max(0, Number(acc.balance) - allocated) } },
    );
  }

  console.log("Migração concluída.");
  process.exit(0);
}

void main();
