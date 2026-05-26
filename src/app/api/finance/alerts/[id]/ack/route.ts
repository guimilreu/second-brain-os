import { type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { acknowledgeAlert } from "@/features/finance/lib/alerts";
import { handleApiError, ok } from "@/lib/http/api-response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await connectToDatabase();
    await acknowledgeAlert(user.userId, id);
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
