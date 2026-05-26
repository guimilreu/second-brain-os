import { model, models, Schema, type InferSchemaType } from "mongoose";

import { NOTE_ACCENTS } from "@/lib/note-accents";

const NoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    folderId: { type: Schema.Types.ObjectId, ref: "NoteFolder", default: null, index: true },
    title: { type: String, default: "Sem título", trim: true },
    blocks: { type: Schema.Types.Mixed },
    snippet: { type: String, default: "", trim: true },
    accent: {
      type: String,
      enum: NOTE_ACCENTS,
      default: "default",
    },
    pinned: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

NoteSchema.index({ userId: 1, folderId: 1, pinned: -1, updatedAt: -1 });

export type NoteDocument = InferSchemaType<typeof NoteSchema>;

export const Note = models.Note || model("Note", NoteSchema);
