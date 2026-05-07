import { wishlistMonthBudgetSchema } from "@/features/wishlist/lib/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { WishlistMonthBudget } from "@/models/WishlistMonthBudget";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const rows = await WishlistMonthBudget.find({ userId: user.userId }).sort({
      monthKey: 1,
    });

    return ok(serializeDocuments(rows));
  } catch (error) {
    return handleApiError(error);
  }
}

async function upsertMonthBudget(request: Request) {
  const user = await requireCurrentUser();
  await connectToDatabase();

  const parsed = wishlistMonthBudgetSchema.parse(await request.json());

  const doc = await WishlistMonthBudget.findOneAndUpdate(
    { userId: user.userId, monthKey: parsed.monthKey },
    { $set: { capAmount: parsed.capAmount } },
    { upsert: true, new: true },
  );

  return ok(serializeDocument(doc));
}

export async function POST(request: Request) {
  try {
    return await upsertMonthBudget(request);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    return await upsertMonthBudget(request);
  } catch (error) {
    return handleApiError(error);
  }
}
