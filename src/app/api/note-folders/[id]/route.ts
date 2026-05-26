import { type NextRequest } from "next/server";
import { noteFolderPatchSchema } from "@/features/notes/lib/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { Note } from "@/models/Note";
import { NoteFolder } from "@/models/NoteFolder";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const parsed = noteFolderPatchSchema.parse(await request.json());
    const existing = await NoteFolder.findOne({ _id: id, userId: user.userId });

    if (!existing) {
      return fail("Pasta não encontrada.", 404);
    }

    const $set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        $set[key] = value;
      }
    }

    if (Object.keys($set).length === 0) {
      return ok(serializeDocument(existing));
    }

    const doc = await NoteFolder.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set },
      { returnDocument: "after" },
    );

    if (!doc) {
      return fail("Pasta não encontrada.", 404);
    }

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

    const existing = await NoteFolder.findOne({ _id: id, userId: user.userId });
    if (!existing) {
      return fail("Pasta não encontrada.", 404);
    }

    await Note.updateMany(
      { userId: user.userId, folderId: id },
      { $set: { folderId: null } },
    );

    await NoteFolder.deleteOne({ _id: id, userId: user.userId });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
