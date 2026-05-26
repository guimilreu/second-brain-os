import { model, models, Schema, type InferSchemaType } from "mongoose";

const ImportBatchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true },
    format: {
      type: String,
      enum: ["ofx", "csv-nubank", "csv-mercadopago", "csv-generic"],
      required: true,
    },
    originalFileName: { type: String, default: "" },
    parsedCount: { type: Number, default: 0 },
    importedCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "preview", "imported", "error"],
      default: "pending",
    },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true },
);

export type ImportBatchDocument = InferSchemaType<typeof ImportBatchSchema>;

export const ImportBatch =
  models.ImportBatch || model("ImportBatch", ImportBatchSchema);
