import { model, models, Schema, type InferSchemaType } from "mongoose";

const NetWorthSnapshotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    assets: { type: Number, required: true },
    liabilities: { type: Number, required: true },
    netWorth: { type: Number, required: true },
    breakdownByAccount: { type: Schema.Types.Mixed, default: {} },
    currency: { type: String, default: "BRL" },
  },
  { timestamps: true },
);

NetWorthSnapshotSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export type NetWorthSnapshotDocument = InferSchemaType<typeof NetWorthSnapshotSchema>;

export const NetWorthSnapshot =
  models.NetWorthSnapshot || model("NetWorthSnapshot", NetWorthSnapshotSchema);
