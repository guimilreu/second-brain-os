import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { RecurringRule } from "@/models/RecurringRule";
import { ScenarioPlan } from "@/models/ScenarioPlan";
import { simulateScenario } from "@/features/finance/lib/scenarios";
import { created, handleApiError, ok } from "@/lib/http/api-response";

const scenarioPlanSchema = z.object({
  name: z.string().min(2),
  assumptions: z
    .array(
      z.object({
        kind: z.string(),
        payload: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
  horizonMonths: z.coerce.number().min(1).max(60).default(12),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const list = await ScenarioPlan.find({ userId: user.userId }).sort({ updatedAt: -1 });
    return ok(serializeDocuments(list));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const body = scenarioPlanSchema.parse(await request.json());
    const plan = await ScenarioPlan.create({ ...body, userId: user.userId });
    const rules = await RecurringRule.find({ userId: user.userId, isActive: true }).lean();
    const plain = serializeDocuments(rules);
    const recurringInputs = plain.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      amount: Number(r.amount),
      type: r.type as "income" | "expense",
      category: String(r.category),
      cadence: r.cadence as "weekly" | "monthly" | "biweekly" | "yearly" | "custom",
      intervalDays: r.intervalDays === undefined ? undefined : Number(r.intervalDays),
      dayOfWeek: r.dayOfWeek === undefined ? undefined : Number(r.dayOfWeek),
      dayOfMonth: r.dayOfMonth === undefined ? undefined : Number(r.dayOfMonth),
      startsAt: String(r.startsAt),
      endsAt: r.endsAt ? String(r.endsAt) : undefined,
      isActive: Boolean(r.isActive),
      allocationPercent: Number(r.allocationPercent ?? 0),
      savingsPotId: r.savingsPotId ? String(r.savingsPotId) : undefined,
    }));
    const projection = simulateScenario(recurringInputs, {
      assumptions: body.assumptions,
      horizonMonths: body.horizonMonths,
    });
    return created({ plan: serializeDocument(plan), projection });
  } catch (error) {
    return handleApiError(error);
  }
}
