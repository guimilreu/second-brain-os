import { model, models, Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    timezone: { type: String, default: "America/Sao_Paulo" },
    defaultCurrency: { type: String, default: "BRL" },
    /** CDI anual em % (ex.: 14.9) — base das estimativas de rendimento dos cofrinhos. */
    cdiAnnualPct: { type: Number, default: null },
    setupCompletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

export const User = models.User || model("User", UserSchema);
