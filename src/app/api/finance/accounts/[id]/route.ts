import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  aggregateConfirmedNet,
  recalculateAccountBalance,
} from "@/features/finance/lib/ledger";
import { bankAccountPatchSchema } from "@/features/finance/lib/schemas";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { BankAccount } from "@/models/BankAccount";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const patch = bankAccountPatchSchema.parse(await request.json());
    const updates: Record<string, unknown> = { ...patch };

    if (updates.balance !== undefined) {
      const net = await aggregateConfirmedNet(user.userId, id);
      const bal = Number(updates.balance);
      updates.openingBalance = bal - net;
      delete updates.balance;
    }

    const account = await BankAccount.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!account) return fail("Conta não encontrada.", 404);
    await recalculateAccountBalance(user.userId, id);
    const fresh = await BankAccount.findById(id);
    return ok(serializeDocument(fresh));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    await BankAccount.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: { isArchived: true } },
    );

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
