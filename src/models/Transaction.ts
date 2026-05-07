import { model, models, Schema, type InferSchemaType } from "mongoose";

const TransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    recurringRuleId: { type: Schema.Types.ObjectId, ref: "RecurringRule", index: true },
    recurringOccurrenceDate: { type: Date },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["income", "expense"], required: true, index: true },
    category: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["planned", "confirmed", "late", "cancelled"],
      default: "confirmed",
    },
    occurredAt: { type: Date, required: true, index: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export type TransactionDocument = InferSchemaType<typeof TransactionSchema>;

export const Transaction =
  models.Transaction || model("Transaction", TransactionSchema);
