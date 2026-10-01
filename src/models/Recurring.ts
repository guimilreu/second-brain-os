import { model, models, Schema, type InferSchemaType } from "mongoose";
import { PAYMENT_METHODS } from "@/features/finance/domain/types";

const RecurringSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["expense", "income"], required: true },
    description: { type: String, required: true, trim: true },
    amountCents: { type: Number, required: true, min: 1 },
    isEstimate: { type: Boolean, default: false },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    method: { type: String, enum: [...PAYMENT_METHODS, null], default: null },
    frequency: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
    monthOfYear: { type: Number, default: null, min: 1, max: 12 },
    startMonth: { type: String, required: true },
    endMonth: { type: String, default: null },
    autoPost: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    skippedMonths: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type RecurringDocument = InferSchemaType<typeof RecurringSchema>;

export const Recurring = models.Recurring || model("Recurring", RecurringSchema);
