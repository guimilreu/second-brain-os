import { model, models, Schema, type InferSchemaType } from "mongoose";

const CategoryBudgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    monthKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    category: { type: String, required: true, trim: true },
    plannedAmount: { type: Number, required: true, min: 0 },
    rolloverFromPrevious: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

CategoryBudgetSchema.index({ userId: 1, monthKey: 1, category: 1 }, { unique: true });

export type CategoryBudgetDocument = InferSchemaType<typeof CategoryBudgetSchema>;

export const CategoryBudget =
  models.CategoryBudget || model("CategoryBudget", CategoryBudgetSchema);
