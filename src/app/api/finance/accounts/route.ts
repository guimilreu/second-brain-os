import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { bankAccountSchema } from "@/features/finance/lib/schemas";
import { BankAccount } from "@/models/BankAccount";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const accounts = await BankAccount.find({
      userId: user.userId,
      isArchived: false,
    }).sort({ createdAt: -1 });

    return ok(serializeDocuments(accounts));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = bankAccountSchema.parse(await request.json());
    const account = await BankAccount.create({ ...payload, userId: user.userId });

    return created(serializeDocument(account));
  } catch (error) {
    return handleApiError(error);
  }
}
