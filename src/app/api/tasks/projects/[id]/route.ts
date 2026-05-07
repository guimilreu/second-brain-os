import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { Project } from "@/models/Project";

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

    const project = await Project.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: safe },
      { new: true },
    );

    if (!project) return fail("Projeto não encontrado.", 404);
    return ok(serializeDocument(project));
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

    await Project.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: { isArchived: true } },
    );

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
