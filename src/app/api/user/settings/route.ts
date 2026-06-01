import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { handleApiError, ok } from "@/lib/http/api-response";
import { serializeDocument } from "@/lib/utils/serialize";
import { User } from "@/models/User";

export const userSettingsSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  defaultCurrency: z.string().length(3).optional(),
  weekStartsOn: z.coerce.number().int().min(0).max(6).optional(),
});

export async function GET() {
  try {
    const session = await requireCurrentUser();
    await connectToDatabase();

    const user = await User.findById(session.userId).select(
      "timezone defaultCurrency weekStartsOn name email",
    );
    if (!user) {
      return handleApiError(new Error("Usuário não encontrado."));
    }

    return ok(serializeDocument(user));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireCurrentUser();
    await connectToDatabase();

    const payload = userSettingsSchema.parse(await request.json());
    const user = await User.findByIdAndUpdate(
      session.userId,
      { $set: payload },
      { new: true },
    ).select("timezone defaultCurrency weekStartsOn name email");

    if (!user) {
      return handleApiError(new Error("Usuário não encontrado."));
    }

    return ok(serializeDocument(user));
  } catch (error) {
    return handleApiError(error);
  }
}
