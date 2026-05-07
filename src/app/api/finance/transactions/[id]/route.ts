import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { applyAccountImpact } from "@/features/finance/lib/accounting";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { Transaction } from "@/models/Transaction";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const body = await request.json();
    const { _id, userId, ...safe } = body as Record<string, unknown>;
    void _id; void userId;

    const existing = await Transaction.findOne({ _id: id, userId: user.userId });
    if (!existing) return fail("Transação não encontrada.", 404);

    await applyAccountImpact(user.userId, existing, -1);

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: safe },
      { new: true },
    );

    if (!transaction) return fail("Transação não encontrada.", 404);
    await applyAccountImpact(user.userId, transaction);
    return ok(serializeDocument(transaction));
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

    const transaction = await Transaction.findOneAndDelete({ _id: id, userId: user.userId });

    if (transaction) {
      await applyAccountImpact(user.userId, transaction, -1);
    }

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
