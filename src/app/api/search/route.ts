import { requireCurrentUser } from "@/lib/auth/current-user";
import { searchAll } from "@/features/search/lib/search";
import { handleApiError, ok } from "@/lib/http/api-response";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    if (q.length < 2) {
      return ok([]);
    }
    const results = await searchAll(user.userId, q);
    return ok(results);
  } catch (error) {
    return handleApiError(error);
  }
}
