import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { applyAccountImpact } from "@/features/finance/lib/accounting";
import { transactionSchema } from "@/features/finance/lib/schemas";
import { Transaction } from "@/models/Transaction";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const transactions = await Transaction.find({ userId: user.userId })
      .sort({ occurredAt: -1 })
      .limit(100);

    return ok(serializeDocuments(transactions));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = transactionSchema.parse(await request.json());
    const transaction = await Transaction.create({ ...payload, userId: user.userId });
    await applyAccountImpact(user.userId, transaction);

    return created(serializeDocument(transaction));
  } catch (error) {
    return handleApiError(error);
  }
}
