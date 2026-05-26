import { z } from "zod";
import { NOTE_ACCENTS } from "@/lib/note-accents";

const accentSchema = z.enum(NOTE_ACCENTS);

export const noteFolderCreateSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  sortOrder: z.number().optional(),
});

export const noteFolderPatchSchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  sortOrder: z.number().optional(),
});

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Id inválido.");

export const noteCreateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  accent: accentSchema.optional(),
  folderId: mongoIdSchema.optional(),
});

export const notePatchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  blocks: z.array(z.unknown()).optional(),
  accent: accentSchema.optional(),
  pinned: z.boolean().optional(),
  folderId: z.union([mongoIdSchema, z.null()]).optional(),
});
