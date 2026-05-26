import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { categoryBudgetPatchSchema } from "@/features/finance/lib/schemas";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { CategoryBudget } from "@/models/CategoryBudget";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();
    const patch = categoryBudgetPatchSchema.parse(await request.json());
    const doc = await CategoryBudget.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: patch },
      { returnDocument: "after" },
    );
    if (!doc) return fail("Orçamento não encontrado.", 404);
    return ok(serializeDocument(doc));
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
    await CategoryBudget.findOneAndDelete({ _id: id, userId: user.userId });
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
