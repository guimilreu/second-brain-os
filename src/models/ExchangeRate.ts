import { model, models, Schema, type InferSchemaType } from "mongoose";

const ExchangeRateSchema = new Schema(
  {
    base: { type: String, required: true, default: "USD" },
    quote: { type: String, required: true, default: "BRL" },
    rate: { type: Number, required: true, min: 0 },
    fetchedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

ExchangeRateSchema.index({ base: 1, quote: 1 }, { unique: true });

export type ExchangeRateDocument = InferSchemaType<typeof ExchangeRateSchema>;

export const ExchangeRate =
  models.ExchangeRate || model("ExchangeRate", ExchangeRateSchema);
