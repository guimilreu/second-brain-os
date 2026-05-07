import { BankAccount } from "@/models/BankAccount";

type AccountImpactInput = {
  bankAccountId?: unknown;
  status?: unknown;
  type?: unknown;
  amount?: unknown;
};

function getAccountId(value: unknown) {
  if (!value) return null;
  return typeof value === "string" ? value : String(value);
}

export function calculateAccountImpact(transaction: AccountImpactInput) {
  const bankAccountId = getAccountId(transaction.bankAccountId);

  if (!bankAccountId || transaction.status !== "confirmed") {
    return null;
  }

  const amount = Number(transaction.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    bankAccountId,
    delta: transaction.type === "income" ? amount : -amount,
  };
}

export async function applyAccountImpact(
  userId: string,
  transaction: AccountImpactInput,
  direction: 1 | -1 = 1,
) {
  const impact = calculateAccountImpact(transaction);

  if (!impact) {
    return;
  }

  await BankAccount.updateOne(
    { _id: impact.bankAccountId, userId },
    { $inc: { balance: impact.delta * direction } },
  );
}
