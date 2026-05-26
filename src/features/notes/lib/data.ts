import { connectToDatabase } from "@/lib/db/mongodb";
import { Note } from "@/models/Note";
import { NoteFolder } from "@/models/NoteFolder";
import type { NoteFolderDTO, NoteListItemDTO, NotesFolderFilter } from "@/features/notes/lib/types";

export async function getNoteFolders(userId: string): Promise<NoteFolderDTO[]> {
  await connectToDatabase();

  const folders = await NoteFolder.find({ userId })
    .sort({ sortOrder: 1, name: 1 })
    .limit(200)
    .lean();

  return folders.map((f) => ({
    id: String(f._id),
    name: f.name,
    sortOrder: f.sortOrder ?? 0,
  }));
}

export async function getNotesList(
  userId: string,
  folderFilter: NotesFolderFilter = "all",
): Promise<NoteListItemDTO[]> {
  await connectToDatabase();

  const filter: Record<string, unknown> = { userId };
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

  return notes.map((n) => ({
    id: String(n._id),
    title: n.title,
    updatedAt: (n.updatedAt as Date).toISOString(),
    snippet: n.snippet ?? "",
    accent: n.accent,
    pinned: n.pinned,
    folderId: n.folderId ? String(n.folderId) : null,
  }));
}

export async function getNotesCount(userId: string): Promise<number> {
  await connectToDatabase();

  return Note.countDocuments({ userId });
}
