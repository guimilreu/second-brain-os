import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getBudgetUsage } from "@/features/finance/lib/budgets";
import { categoryBudgetSchema } from "@/features/finance/lib/schemas";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { CategoryBudget } from "@/models/CategoryBudget";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const monthKey = searchParams.get("monthKey") ?? new Date().toISOString().slice(0, 7);
    const withUsage = searchParams.get("usage") === "1";
    if (withUsage) {
      const usage = await getBudgetUsage(user.userId, monthKey);
      return ok({ budgets: usage, monthKey });
    }
    const budgets = await CategoryBudget.find({ userId: user.userId, monthKey }).sort({
      category: 1,
    });
    return ok(serializeDocuments(budgets));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const body = categoryBudgetSchema.parse(await request.json());
    const doc = await CategoryBudget.create({ ...body, userId: user.userId });
    return created(serializeDocument(doc));
  } catch (error) {
    return handleApiError(error);
  }
}
