import { model, models, Schema, type InferSchemaType } from "mongoose";

const NoteFolderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

NoteFolderSchema.index({ userId: 1, sortOrder: 1, name: 1 });

export type NoteFolderDocument = InferSchemaType<typeof NoteFolderSchema>;

export const NoteFolder = models.NoteFolder || model("NoteFolder", NoteFolderSchema);
