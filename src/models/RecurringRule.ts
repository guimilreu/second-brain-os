import { model, models, Schema, type InferSchemaType } from "mongoose";

const RecurringRuleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true, trim: true },
    cadence: { type: String, enum: ["weekly", "monthly"], required: true },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    isActive: { type: Boolean, default: true },
    allocationPercent: { type: Number, min: 0, max: 100, default: 0 },
    savingsPotId: { type: Schema.Types.ObjectId, ref: "SavingsPot" },
  },
  { timestamps: true },
);

export type RecurringRuleDocument = InferSchemaType<typeof RecurringRuleSchema>;

export const RecurringRule =
  models.RecurringRule || model("RecurringRule", RecurringRuleSchema);
