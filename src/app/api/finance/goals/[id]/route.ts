import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { FinancialGoal } from "@/models/FinancialGoal";

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

    const goal = await FinancialGoal.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: safe },
      { new: true },
    );

    if (!goal) return fail("Meta não encontrada.", 404);
    return ok(serializeDocument(goal));
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

    await FinancialGoal.findOneAndDelete({ _id: id, userId: user.userId });
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
