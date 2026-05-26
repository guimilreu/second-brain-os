import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import {
  PotAllocationError,
  refreshAccountAfterPotChange,
} from "@/features/finance/lib/pots-validation";
import { savingsPotSchema } from "@/features/finance/lib/schemas";
import { SavingsPot } from "@/models/SavingsPot";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const pots = await SavingsPot.find({ userId: user.userId }).sort({ priority: 1 });

    return ok(serializeDocuments(pots));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const payload = savingsPotSchema.parse(await request.json());
    const pot = await SavingsPot.create({ ...payload, userId: user.userId });
    await refreshAccountAfterPotChange(user.userId, payload.bankAccountId);

    return created(serializeDocument(pot));
  } catch (error) {
    if (error instanceof PotAllocationError) {
      return fail(error.message, 422);
    }
    return handleApiError(error);
  }
}
