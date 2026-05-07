import { cookies } from "next/headers";
import { z } from "zod";
import { ensureBootstrapUser } from "@/lib/auth/bootstrap-user";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
} from "@/lib/auth/token";
import { connectToDatabase } from "@/lib/db/mongodb";
import { fail, handleApiError, ok } from "@/lib/http/api-response";
import { User } from "@/models/User";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await ensureBootstrapUser();
    await connectToDatabase();

    const payload = loginSchema.parse(await request.json());
    const user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      return fail("E-mail ou senha inválidos.", 401);
    }

    const isValidPassword = await verifyPassword(payload.password, user.passwordHash);

    if (!isValidPassword) {
      return fail("E-mail ou senha inválidos.", 401);
    }

    const token = await signSessionToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return ok({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
