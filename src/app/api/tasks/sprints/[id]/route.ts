import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { WeeklySprint } from "@/models/WeeklySprint";

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

    const sprint = await WeeklySprint.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: safe },
      { new: true },
    );

    if (!sprint) return fail("Sprint não encontrada.", 404);
    return ok(serializeDocument(sprint));
  } catch (error) {
    return handleApiError(error);
  }
}
