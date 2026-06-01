import { model, models, Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    timezone: { type: String, default: "America/Sao_Paulo" },
    defaultCurrency: { type: String, default: "BRL" },
    weekStartsOn: { type: Number, default: 1, min: 0, max: 6 },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

export const User = models.User || model("User", UserSchema);
