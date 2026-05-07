import { model, models, Schema, type InferSchemaType } from "mongoose";

const BankAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["checking", "savings", "wallet", "investment", "credit"],
      default: "checking",
    },
    balance: { type: Number, required: true, default: 0 },
    color: { type: String, required: true, default: "#635bff" },
    icon: { type: String, required: true, default: "Landmark" },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type BankAccountDocument = InferSchemaType<typeof BankAccountSchema>;

export const BankAccount =
  models.BankAccount || model("BankAccount", BankAccountSchema);
