import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { transferCreateSchema } from "@/features/finance/lib/schemas";
import { executeTransfer, TransferError } from "@/features/finance/lib/transfers";
import { created, fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { Transfer } from "@/models/Transfer";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const body = transferCreateSchema.parse(await request.json());
    const result = await executeTransfer(user.userId, body);
    return created(serializeDocument(result.transfer));
  } catch (error) {
    if (error instanceof TransferError) {
      return fail(error.message, error.status);
    }
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();
    const list = await Transfer.find({ userId: user.userId })
      .sort({ occurredAt: -1 })
      .limit(100)
      .lean();
    return ok(serializeDocuments(list));
  } catch (error) {
    return handleApiError(error);
  }
}
