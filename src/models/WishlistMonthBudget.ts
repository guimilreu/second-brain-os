import { model, models, Schema, type InferSchemaType } from "mongoose";

const WishlistMonthBudgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    monthKey: { type: String, required: true, trim: true },
    capAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

WishlistMonthBudgetSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export type WishlistMonthBudgetDocument = InferSchemaType<
  typeof WishlistMonthBudgetSchema
>;

export const WishlistMonthBudget =
  models.WishlistMonthBudget ||
  model("WishlistMonthBudget", WishlistMonthBudgetSchema);
