import { model, models, Schema, type InferSchemaType } from "mongoose";

const CategorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["expense", "income"], required: true },
    color: { type: String, default: "#64748b" },
    icon: { type: String, default: "tag" },
    limitCents: { type: Number, default: null },
    archived: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    systemKey: { type: String, enum: ["adjustment", "yield", "opening", null], default: null },
  },
  { timestamps: true },
);

export type CategoryDocument = InferSchemaType<typeof CategorySchema>;

export const Category = models.Category || model("Category", CategorySchema);
