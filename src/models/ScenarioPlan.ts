import { model, models, Schema, type InferSchemaType } from "mongoose";

const ScenarioAssumptionSchema = new Schema(
  {
    kind: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const ScenarioPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    assumptions: { type: [ScenarioAssumptionSchema], default: [] },
    horizonMonths: { type: Number, default: 12, min: 1, max: 60 },
  },
  { timestamps: true },
);

export type ScenarioPlanDocument = InferSchemaType<typeof ScenarioPlanSchema>;

export const ScenarioPlan =
  models.ScenarioPlan || model("ScenarioPlan", ScenarioPlanSchema);
