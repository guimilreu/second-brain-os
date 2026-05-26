import { model, models, Schema, type InferSchemaType } from "mongoose";

const SavingsPotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", index: true },
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ["reserve", "goal", "bill-fund", "investment-target"],
      default: "reserve",
    },
    targetAmount: { type: Number, required: true, min: 0 },
    currentAmount: { type: Number, required: true, min: 0, default: 0 },
    monthlyContributionTarget: { type: Number, min: 0 },
    linkedGoalId: { type: Schema.Types.ObjectId, ref: "FinancialGoal" },
    color: { type: String, required: true, default: "#16a34a" },
    icon: { type: String, required: true, default: "PiggyBank" },
    priority: { type: Number, default: 1 },
  },
  { timestamps: true },
);

SavingsPotSchema.index({ userId: 1, bankAccountId: 1 });

export type SavingsPotDocument = InferSchemaType<typeof SavingsPotSchema>;

export const SavingsPot =
  models.SavingsPot || model("SavingsPot", SavingsPotSchema);
