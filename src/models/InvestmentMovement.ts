import { model, models, Schema, type InferSchemaType } from "mongoose";

const InvestmentMovementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    investmentId: { type: Schema.Types.ObjectId, ref: "Investment", required: true, index: true },
    kind: {
      type: String,
      enum: ["deposit", "withdraw", "yield", "valuation"],
      required: true,
    },
    amount: { type: Number, required: true },
    occurredAt: { type: Date, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export type InvestmentMovementDocument = InferSchemaType<typeof InvestmentMovementSchema>;

export const InvestmentMovement =
  models.InvestmentMovement || model("InvestmentMovement", InvestmentMovementSchema);
