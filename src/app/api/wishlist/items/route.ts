import { type NextRequest } from "next/server";
import { wishlistItemCreateSchema } from "@/features/wishlist/lib/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { created, fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { WishlistItem } from "@/models/WishlistItem";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const url = new URL(request.url);
    const monthKey = url.searchParams.get("monthKey") ?? undefined;
    const lane = url.searchParams.get("lane") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;

    const query: Record<string, unknown> = { userId: user.userId };
    if (monthKey !== undefined && monthKey !== "") {
      query.plannedMonthKey = monthKey;
    }
    if (lane) {
      query.lane = lane;
    }
    if (status) {
      query.status = status;
    }

    const items = await WishlistItem.find(query).sort({
      lane: 1,
      plannedMonthKey: 1,
      sortOrder: 1,
      createdAt: -1,
    });

    return ok(serializeDocuments(items));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await connectToDatabase();

    const parsed = wishlistItemCreateSchema.parse(await request.json());

    if (parsed.lane === "planned" && !parsed.plannedMonthKey) {
      return fail("Informe o mês (YYYY-MM) para itens planejados.", 422);
    }

    const plannedMonthKey = parsed.lane === "dream" ? null : parsed.plannedMonthKey ?? null;

    const doc = await WishlistItem.create({
      ...parsed,
      plannedMonthKey,
      userId: user.userId,
    });

    return created(serializeDocument(doc));
  } catch (error) {
    return handleApiError(error);
  }
}
