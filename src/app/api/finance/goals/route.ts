import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { financialGoalSchema } from "@/features/finance/lib/schemas";
import { FinancialGoal } from "@/models/FinancialGoal";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const goals = await FinancialGoal.find({ userId: user.userId }).sort({
      status: 1,
      dueDate: 1,
    });

    return ok(serializeDocuments(goals));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = financialGoalSchema.parse(await request.json());
    const goal = await FinancialGoal.create({ ...payload, userId: user.userId });

    return created(serializeDocument(goal));
  } catch (error) {
    return handleApiError(error);
  }
}
