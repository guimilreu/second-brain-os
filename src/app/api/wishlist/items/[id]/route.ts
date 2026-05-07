import { type NextRequest } from "next/server";
import { wishlistItemPatchSchema } from "@/features/wishlist/lib/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { WishlistItem } from "@/models/WishlistItem";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const parsed = wishlistItemPatchSchema.parse(await request.json());
    const existing = await WishlistItem.findOne({ _id: id, userId: user.userId });

    if (!existing) {
      return fail("Item não encontrado.", 404);
    }

    const lane = (parsed.lane ?? existing.lane) as string;
    let plannedMonthKey =
      parsed.plannedMonthKey !== undefined
        ? parsed.plannedMonthKey
        : existing.plannedMonthKey;

    if (lane === "dream") {
      plannedMonthKey = null;
    }

    if (lane === "planned" && (!plannedMonthKey || plannedMonthKey === "")) {
      return fail("Informe o mês planejado (YYYY-MM).", 422);
    }

    const status = (parsed.status ?? existing.status) as string;
    const actualPriceRaw =
      parsed.actualPrice !== undefined ? parsed.actualPrice : existing.actualPrice;

    if (status === "purchased") {
      if (actualPriceRaw === undefined || actualPriceRaw === null) {
        return fail("Informe o valor real pago ao marcar como comprado.", 422);
      }
    }

    const $set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        $set[key] = value;
      }
    }

    if (parsed.lane !== undefined || parsed.plannedMonthKey !== undefined || lane === "dream") {
      $set.lane = lane;
      $set.plannedMonthKey = plannedMonthKey;
    }

    if (parsed.status !== undefined || parsed.actualPrice !== undefined || parsed.purchasedAt !== undefined) {
      $set.status = status;
      if (parsed.actualPrice !== undefined) {
        $set.actualPrice = parsed.actualPrice;
      }
      if (status === "purchased") {
        $set.actualPrice = Number(actualPriceRaw);
        $set.purchasedAt =
          parsed.purchasedAt !== undefined ? parsed.purchasedAt : existing.purchasedAt ?? new Date();
      }
    }

    const doc = await WishlistItem.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set },
      { new: true },
    );

    if (!doc) {
      return fail("Item não encontrado.", 404);
    }

    return ok(serializeDocument(doc));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();

    const deleted = await WishlistItem.findOneAndDelete({
      _id: id,
      userId: user.userId,
    });

    if (!deleted) {
      return fail("Item não encontrado.", 404);
    }

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
