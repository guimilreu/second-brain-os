import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/token";
import { ok } from "@/lib/http/api-response";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return ok({ success: true });
}
