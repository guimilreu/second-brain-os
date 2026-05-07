import { model, models, Schema, type InferSchemaType } from "mongoose";

const TaskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    sprintId: { type: Schema.Types.ObjectId, ref: "WeeklySprint" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["todo", "doing", "done", "blocked"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    plannedFor: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export type TaskDocument = InferSchemaType<typeof TaskSchema>;

export const Task = models.Task || model("Task", TaskSchema);
