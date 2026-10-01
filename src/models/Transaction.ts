import { model, models, Schema, type InferSchemaType } from "mongoose";
import { PAYMENT_METHODS, TX_TYPES } from "@/features/finance/domain/types";

const InstallmentSchema = new Schema(
  {
    groupId: { type: String, required: true },
    index: { type: Number, required: true, min: 1 },
    count: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const TransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: TX_TYPES, required: true },
    amountCents: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Valor em centavos deve ser inteiro." },
    },
    description: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    toAccountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    date: { type: String, required: true },
    competence: { type: String, required: true },
    method: { type: String, enum: [...PAYMENT_METHODS, null], default: null },
    invoiceMonth: { type: String, default: null },
    /** Fatura escolhida à mão (não recalcula quando as datas do cartão mudam). */
    invoiceLocked: { type: Boolean, default: false },
    installment: { type: InstallmentSchema, default: null },
    recurringId: { type: Schema.Types.ObjectId, ref: "Recurring", default: null },
    recurringMonth: { type: String, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

TransactionSchema.index({ userId: 1, competence: 1 });
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, "installment.groupId": 1 });
// Uma ocorrência de recorrência só pode ser lançada uma vez.
TransactionSchema.index(
  { userId: 1, recurringId: 1, recurringMonth: 1 },
  { unique: true, partialFilterExpression: { recurringId: { $type: "objectId" } } },
);

export type TransactionDocument = InferSchemaType<typeof TransactionSchema>;

export const Transaction = models.Transaction || model("Transaction", TransactionSchema);
