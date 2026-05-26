import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { Debt } from "@/models/Debt";

const debtPatchSchema = z
  .object({
    name: z.string().min(2).optional(),
    creditor: z.string().optional(),
    principal: z.coerce.number().min(0).optional(),
    paidInstallments: z.coerce.number().min(0).optional(),
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
    const patch = debtPatchSchema.parse(await request.json());
    const doc = await Debt.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: patch },
      { returnDocument: "after" },
    );
    if (!doc) return fail("Dívida não encontrada.", 404);
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
    await Debt.findOneAndDelete({ _id: id, userId: user.userId });
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
