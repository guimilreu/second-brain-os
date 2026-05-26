import { model, models, Schema, type InferSchemaType } from "mongoose";

const InstallmentPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    totalAmount: { type: Number, required: true, min: 0 },
    installments: { type: Number, required: true, min: 1 },
    firstChargeDate: { type: Date, required: true },
    interestRate: { type: Number, min: 0 },
    notes: { type: String, default: "" },
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type InstallmentPlanDocument = InferSchemaType<typeof InstallmentPlanSchema>;

export const InstallmentPlan =
  models.InstallmentPlan || model("InstallmentPlan", InstallmentPlanSchema);
