import { model, models, Schema, type InferSchemaType } from "mongoose";

const WeeklySprintSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    intention: { type: String, default: "" },
    status: {
      type: String,
      enum: ["planned", "active", "completed"],
      default: "active",
    },
  },
  { timestamps: true },
);

export type WeeklySprintDocument = InferSchemaType<typeof WeeklySprintSchema>;

export const WeeklySprint =
  models.WeeklySprint || model("WeeklySprint", WeeklySprintSchema);
