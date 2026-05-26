import { model, models, Schema, type InferSchemaType } from "mongoose";

const DebtSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    creditor: { type: String, default: "", trim: true },
    principal: { type: Number, required: true, min: 0 },
    interestRateMonthly: { type: Number, default: 0, min: 0 },
    installments: { type: Number, required: true, min: 1 },
    startsAt: { type: Date, required: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    linkedInstallmentPlanId: { type: Schema.Types.ObjectId, ref: "InstallmentPlan" },
    notes: { type: String, default: "" },
    paidInstallments: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export type DebtDocument = InferSchemaType<typeof DebtSchema>;

export const Debt = models.Debt || model("Debt", DebtSchema);
