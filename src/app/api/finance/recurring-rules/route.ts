import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { recurringRuleSchema } from "@/features/finance/lib/schemas";
import { RecurringRule } from "@/models/RecurringRule";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const rules = await RecurringRule.find({
      userId: user.userId,
      isActive: true,
    }).sort({ type: 1, title: 1 });

    return ok(serializeDocuments(rules));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = recurringRuleSchema.parse(await request.json());
    const rule = await RecurringRule.create({ ...payload, userId: user.userId });

    return created(serializeDocument(rule));
  } catch (error) {
    return handleApiError(error);
  }
}
