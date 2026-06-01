import { model, models, Schema, type InferSchemaType } from "mongoose";

const FinanceAlertSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: {
      type: String,
      enum: [
        "low-balance",
        "invoice-due",
        "budget-exceeded",
        "goal-milestone",
        "recurring-late",
        "unusual-spending",
        "wishlist-over-free",
        "goal-funding-gap",
      ],
      required: true,
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    triggeredAt: { type: Date, default: () => new Date() },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true },
);

export type FinanceAlertDocument = InferSchemaType<typeof FinanceAlertSchema>;

export const FinanceAlert =
  models.FinanceAlert || model("FinanceAlert", FinanceAlertSchema);
