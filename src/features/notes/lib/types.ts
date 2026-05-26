import type { NoteAccent } from "@/lib/note-accents";

export type { NoteAccent };

/** Filtro na lista: todas, sem pasta, ou id de uma pasta. */
export type NotesFolderFilter = "all" | "none" | string;

export type NoteFolderDTO = {
  id: string;
  name: string;
  sortOrder: number;
};

export type NoteListItemDTO = {
  id: string;
  title: string;
  updatedAt: string;
  snippet: string;
  accent: NoteAccent;
  pinned: boolean;
  folderId: string | null;
};

export type NoteDetailDTO = NoteListItemDTO & {
  blocks?: unknown[];
};
