import { model, models, Schema, type InferSchemaType } from "mongoose";

const BankAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["checking", "savings", "wallet", "investment", "credit", "loan"],
      default: "checking",
    },
    /** Ex.: mercado-pago, nubank — só UI/slug */
    subtype: { type: String, trim: true, default: "" },
    currency: { type: String, default: "BRL", uppercase: true, trim: true },
    /** Saldo inicial + lançamentos incluídos no saldo (cache). */
    openingBalance: { type: Number, default: 0 },
    balance: { type: Number, required: true, default: 0 },
    /** Saldo livre após cofrinhos (cache). */
    availableBalance: { type: Number, default: 0 },
    creditLimit: { type: Number, min: 0 },
    closingDay: { type: Number, min: 1, max: 31 },
    dueDay: { type: Number, min: 1, max: 31 },
    interestRateMonthly: { type: Number, min: 0 },
    includeInNetWorth: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    /** Alerta de saldo livre (Fase 8). */
    safeMinimum: { type: Number, min: 0, default: 0 },
    color: { type: String, required: true, default: "#ffc100" },
    icon: { type: String, required: true, default: "Landmark" },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type BankAccountDocument = InferSchemaType<typeof BankAccountSchema>;

export const BankAccount =
  models.BankAccount || model("BankAccount", BankAccountSchema);
