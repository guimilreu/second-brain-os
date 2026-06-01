import { model, models, Schema, type InferSchemaType } from "mongoose";

const SplitItemSchema = new Schema(
  {
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String, default: "" },
    mime: { type: String, default: "" },
  },
  { _id: false },
);

const TransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    recurringRuleId: { type: Schema.Types.ObjectId, ref: "RecurringRule", index: true },
    recurringOccurrenceDate: { type: Date },
    transferId: { type: Schema.Types.ObjectId, ref: "Transfer", index: true },
    creditCardInvoiceId: { type: Schema.Types.ObjectId, ref: "CreditCardInvoice" },
    installmentPlanId: { type: Schema.Types.ObjectId, ref: "InstallmentPlan" },
    installmentNumber: { type: Number, min: 1 },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["income", "expense"], required: true, index: true },
    category: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["planned", "scheduled", "confirmed", "late", "cancelled"],
      default: "confirmed",
    },
    occurredAt: { type: Date, required: true, index: true },
    notes: { type: String, default: "" },
    payee: { type: String, default: "", trim: true },
    paymentMethod: {
      type: String,
      enum: ["pix", "debit", "credit", "cash", "boleto", "ted", "internal"],
    },
    tags: { type: [String], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
    splits: { type: [SplitItemSchema], default: [] },
    externalId: { type: String, trim: true, index: true },
    importBatchId: { type: Schema.Types.ObjectId, ref: "ImportBatch" },
    /** Se false, não entra no agregado de saldo da conta (ex.: compra de cartão até pagar fatura). */
    includeInAccountBalance: { type: Boolean, default: true },
    reconciled: { type: Boolean, default: false },
    currency: { type: String, default: "BRL", uppercase: true, trim: true },
    wishlistItemId: { type: Schema.Types.ObjectId, ref: "WishlistItem" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
  },
  { timestamps: true },
);

TransactionSchema.index({ userId: 1, bankAccountId: 1, status: 1 });

export type TransactionDocument = InferSchemaType<typeof TransactionSchema>;

export const Transaction =
  models.Transaction || model("Transaction", TransactionSchema);
