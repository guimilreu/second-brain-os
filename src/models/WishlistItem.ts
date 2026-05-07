import { model, models, Schema, type InferSchemaType } from "mongoose";

const WishlistItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    url: { type: String, default: "", trim: true },
    category: { type: String, required: true, trim: true },
    lane: {
      type: String,
      enum: ["dream", "planned", "archive"],
      default: "dream",
      index: true,
    },
    plannedMonthKey: { type: String, default: null, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: ["idea", "researching", "ready", "purchased", "cancelled"],
      default: "idea",
      index: true,
    },
    estimatedPrice: { type: Number, required: true, min: 0, default: 0 },
    actualPrice: { type: Number, min: 0 },
    purchasedAt: { type: Date },
  },
  { timestamps: true },
);

WishlistItemSchema.index({ userId: 1, lane: 1, plannedMonthKey: 1, sortOrder: 1 });

export type WishlistItemDocument = InferSchemaType<typeof WishlistItemSchema>;

export const WishlistItem =
  models.WishlistItem || model("WishlistItem", WishlistItemSchema);
