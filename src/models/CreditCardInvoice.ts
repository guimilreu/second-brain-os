import { model, models, Schema, type InferSchemaType } from "mongoose";

const CreditCardInvoiceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true, index: true },
    cycleStart: { type: Date, required: true },
    cycleEnd: { type: Date, required: true },
    closingDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    total: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    minimumPayment: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["open", "closed", "paid", "partial", "late"],
      default: "open",
    },
    currency: { type: String, default: "BRL" },
  },
  { timestamps: true },
);

CreditCardInvoiceSchema.index(
  { bankAccountId: 1, cycleStart: 1, cycleEnd: 1 },
  { unique: true },
);

export type CreditCardInvoiceDocument = InferSchemaType<typeof CreditCardInvoiceSchema>;

export const CreditCardInvoice =
  models.CreditCardInvoice || model("CreditCardInvoice", CreditCardInvoiceSchema);
