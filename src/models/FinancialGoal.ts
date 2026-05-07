import { model, models, Schema, type InferSchemaType } from "mongoose";

const FinancialGoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    targetAmount: { type: Number, required: true, min: 0 },
    currentAmount: { type: Number, required: true, min: 0, default: 0 },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
  },
  { timestamps: true },
);

export type FinancialGoalDocument = InferSchemaType<typeof FinancialGoalSchema>;

export const FinancialGoal =
  models.FinancialGoal || model("FinancialGoal", FinancialGoalSchema);
