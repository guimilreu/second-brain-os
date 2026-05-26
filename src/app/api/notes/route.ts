import { type NextRequest } from "next/server";
import type { NotesFolderFilter } from "@/features/notes/lib/types";
import { noteCreateSchema } from "@/features/notes/lib/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { Note } from "@/models/Note";
import { NoteFolder } from "@/models/NoteFolder";

function parseFolderFilter(searchParams: URLSearchParams): NotesFolderFilter {
  const raw = searchParams.get("folderId");
  if (raw === "none") return "none";
  if (raw && raw !== "all") return raw;
  return "all";
}

function listProjection(doc: {
  _id: { toString: () => string };
  title: string;
  updatedAt: Date;
  snippet?: string;
  accent: string;
  pinned: boolean;
  folderId?: unknown;
}) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    updatedAt: doc.updatedAt.toISOString(),
    snippet: doc.snippet ?? "",
    accent: doc.accent,
    pinned: doc.pinned,
    folderId: doc.folderId ? String(doc.folderId as { toString: () => string }) : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const folderFilter = parseFolderFilter(request.nextUrl.searchParams);
    const filter: Record<string, unknown> = { userId: user.userId };
    if (folderFilter === "none") {
      filter.$or = [{ folderId: null }, { folderId: { $exists: false } }];
    } else if (folderFilter !== "all") {
      filter.folderId = folderFilter;
    }

    const notes = await Note.find(filter)
      .select("title updatedAt snippet accent pinned folderId")
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(400)
      .lean();

    return ok(notes.map((n) => listProjection(n as Parameters<typeof listProjection>[0])));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const body = noteCreateSchema.parse(await request.json().catch(() => ({})));
    if (body.folderId) {
      const folderOk = await NoteFolder.exists({ _id: body.folderId, userId: user.userId });
      if (!folderOk) {
        return fail("Pasta não encontrada.", 404);
      }
    }

    const note = await Note.create({
      userId: user.userId,
      title: body.title ?? "Sem título",
      accent: body.accent ?? "default",
      snippet: "",
      folderId: body.folderId ?? null,
    });

    return created(serializeDocument(note));
  } catch (error) {
    return handleApiError(error);
  }
}
