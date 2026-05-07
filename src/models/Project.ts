import { model, models, Schema, type InferSchemaType } from "mongoose";

const ProjectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    color: { type: String, required: true, default: "#ffc100" },
    icon: { type: String, required: true, default: "FolderKanban" },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ProjectDocument = InferSchemaType<typeof ProjectSchema>;

export const Project = models.Project || model("Project", ProjectSchema);
