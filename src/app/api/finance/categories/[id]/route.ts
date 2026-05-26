import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { categoryCreateSchema } from "@/features/finance/lib/schemas";
import { slugify } from "@/lib/finance/seed-categories";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { Category } from "@/models/Category";

const categoryPatchSchema = categoryCreateSchema.partial();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();
    const patch = categoryPatchSchema.parse(await request.json());
    const updates: Record<string, unknown> = { ...patch };
    if (patch.name && !patch.slug) {
      updates.slug = slugify(patch.name);
    }
    const doc = await Category.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: updates },
      { returnDocument: "after" },
    );
    if (!doc) return fail("Categoria não encontrada.", 404);
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
    await Category.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: { isArchived: true } },
    );
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
