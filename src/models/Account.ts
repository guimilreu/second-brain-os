import { model, models, Schema, type InferSchemaType } from "mongoose";
import { ACCOUNT_KINDS, ACCOUNT_PURPOSES, INSTITUTIONS } from "@/features/finance/domain/types";

const CycleOverrideSchema = new Schema(
  {
    month: { type: String, required: true },
    closingDate: { type: String, required: true },
    dueDate: { type: String, required: true },
  },
  { _id: false },
);

const CardSchema = new Schema(
  {
    closingDay: { type: Number, required: true, min: 1, max: 31 },
    dueDay: { type: Number, required: true, min: 1, max: 31 },
    limitCents: { type: Number, default: null },
    reserveAccountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    cycleOverrides: { type: [CycleOverrideSchema], default: [] },
  },
  { _id: false },
);

const GoalSchema = new Schema(
  {
    targetCents: { type: Number, required: true, min: 0 },
    targetDate: { type: String, default: null },
    monthlyCents: { type: Number, default: null },
  },
  { _id: false },
);

const AccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    institution: { type: String, enum: INSTITUTIONS, default: "other" },
    kind: { type: String, enum: ACCOUNT_KINDS, required: true },
    purpose: { type: String, enum: [...ACCOUNT_PURPOSES, null], default: null },
    color: { type: String, default: "#6366f1" },
    yieldCdiPct: { type: Number, default: null },
    openingBalanceCents: { type: Number, default: 0 },
    openingDate: { type: String, required: true },
    archived: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    card: { type: CardSchema, default: null },
    goal: { type: GoalSchema, default: null },
    lastReconciledAt: { type: String, default: null },
  },
  { timestamps: true },
);

export type AccountDocument = InferSchemaType<typeof AccountSchema>;

export const Account = models.Account || model("Account", AccountSchema);
