import { model, models, Schema, type InferSchemaType } from "mongoose";

const CategorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    kind: {
      type: String,
      enum: ["income", "expense", "both"],
      default: "expense",
    },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    color: { type: String, default: "#94a3b8" },
    icon: { type: String, default: "Tag" },
    displayOrder: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

CategorySchema.index({ userId: 1, slug: 1 }, { unique: true });

export type CategoryDocument = InferSchemaType<typeof CategorySchema>;

export const Category = models.Category || model("Category", CategorySchema);
