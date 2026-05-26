import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  PotAllocationError,
  refreshAccountAfterPotChange,
} from "@/features/finance/lib/pots-validation";
import { savingsPotPatchSchema } from "@/features/finance/lib/schemas";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { SavingsPot } from "@/models/SavingsPot";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const patch = savingsPotPatchSchema.parse(await request.json());
    const existing = await SavingsPot.findOne({ _id: id, userId: user.userId });
    if (!existing) return fail("Cofrinho não encontrado.", 404);

    const pot = await SavingsPot.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: patch },
      { returnDocument: "after" },
    );

    if (!pot) return fail("Cofrinho não encontrado.", 404);

    const accountId = String(pot.bankAccountId ?? "");
    if (accountId) {
      await refreshAccountAfterPotChange(user.userId, accountId);
    }
    return ok(serializeDocument(pot));
  } catch (error) {
    if (error instanceof PotAllocationError) {
      return fail(error.message, 422);
    }
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

    const existing = await SavingsPot.findOne({ _id: id, userId: user.userId });
    const accountId = existing?.bankAccountId ? String(existing.bankAccountId) : null;

    await SavingsPot.findOneAndDelete({ _id: id, userId: user.userId });
    if (accountId) {
      await refreshAccountAfterPotChange(user.userId, accountId);
    }
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
