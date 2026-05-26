import { model, models, Schema, type InferSchemaType } from "mongoose";

const InvestmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true },
    name: { type: String, required: true, trim: true },
    assetClass: {
      type: String,
      enum: ["fixed-income", "stocks", "crypto", "funds", "other"],
      default: "other",
    },
    purchaseDate: { type: Date, required: true },
    principal: { type: Number, required: true, min: 0 },
    currentValue: { type: Number, required: true, min: 0 },
    expectedRateAnnual: { type: Number, min: 0 },
    maturityDate: { type: Date },
    liquidity: {
      type: String,
      enum: ["daily", "30d", "until-maturity"],
      default: "daily",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export type InvestmentDocument = InferSchemaType<typeof InvestmentSchema>;

export const Investment = models.Investment || model("Investment", InvestmentSchema);
