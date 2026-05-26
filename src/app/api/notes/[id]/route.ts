import { type NextRequest } from "next/server";
import { notePatchSchema } from "@/features/notes/lib/schemas";
import { snippetFromBlocks } from "@/features/notes/lib/snippet";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { Note } from "@/models/Note";
import { NoteFolder } from "@/models/NoteFolder";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const note = await Note.findOne({ _id: id, userId: user.userId });

    if (!note) {
      return fail("Anotação não encontrada.", 404);
    }

    return ok(serializeDocument(note));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const parsed = notePatchSchema.parse(await request.json());

    if (parsed.folderId !== undefined && parsed.folderId !== null) {
      const folderOk = await NoteFolder.exists({ _id: parsed.folderId, userId: user.userId });
      if (!folderOk) {
        return fail("Pasta não encontrada.", 404);
      }
    }

    const exists = await Note.exists({ _id: id, userId: user.userId });
    if (!exists) {
      return fail("Anotação não encontrada.", 404);
    }

    const $set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        $set[key] = value;
      }
    }

    if (parsed.blocks !== undefined) {
      $set.snippet = snippetFromBlocks(parsed.blocks);
    }

    const doc = await Note.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set },
      { returnDocument: "after" },
    );

    if (!doc) {
      return fail("Anotação não encontrada.", 404);
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

    const deleted = await Note.findOneAndDelete({
      _id: id,
      userId: user.userId,
    });

    if (!deleted) {
      return fail("Anotação não encontrada.", 404);
    }

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
