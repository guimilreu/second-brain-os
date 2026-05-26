import { model, models, Schema, type InferSchemaType } from "mongoose";

/** Tipos de repasse. Cofrinho não gera linhas duplas de saldo da conta — só atualização de currentAmount nos pots. */
export const TRANSFER_KINDS = [
  "account-to-account",
  "account-to-pot",
  "pot-to-account",
  "pot-to-pot",
  "invoice-payment",
  "investment-deposit",
  "investment-withdraw",
] as const;

const TransferSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: TRANSFER_KINDS, required: true },
    fromAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    fromPotId: { type: Schema.Types.ObjectId, ref: "SavingsPot" },
    toAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    toPotId: { type: Schema.Types.ObjectId, ref: "SavingsPot" },
    creditCardInvoiceId: { type: Schema.Types.ObjectId, ref: "CreditCardInvoice" },
    amount: { type: Number, required: true, min: 0 },
    fee: { type: Number, default: 0, min: 0 },
    occurredAt: { type: Date, required: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "confirmed"],
      default: "confirmed",
    },
    /** IDs das duas pernas quando kind = account-to-account */
    expenseTransactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    incomeTransactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
  },
  { timestamps: true },
);

TransferSchema.index({ userId: 1, occurredAt: -1 });

export type TransferDocument = InferSchemaType<typeof TransferSchema>;

export const Transfer = models.Transfer || model("Transfer", TransferSchema);
