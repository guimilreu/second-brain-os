import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { Investment } from "@/models/Investment";

const patchSchema = z
  .object({
    name: z.string().min(2).optional(),
    currentValue: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();
    const patch = patchSchema.parse(await request.json());
    const doc = await Investment.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: patch },
      { returnDocument: "after" },
    );
    if (!doc) return fail("Investimento não encontrado.", 404);
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
    await Investment.findOneAndDelete({ _id: id, userId: user.userId });
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
