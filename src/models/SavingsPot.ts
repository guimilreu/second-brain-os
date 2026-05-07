import { model, models, Schema, type InferSchemaType } from "mongoose";

const SavingsPotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0 },
    currentAmount: { type: Number, required: true, min: 0, default: 0 },
    color: { type: String, required: true, default: "#16a34a" },
    icon: { type: String, required: true, default: "PiggyBank" },
    priority: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export type SavingsPotDocument = InferSchemaType<typeof SavingsPotSchema>;

export const SavingsPot =
  models.SavingsPot || model("SavingsPot", SavingsPotSchema);
