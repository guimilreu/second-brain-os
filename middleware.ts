import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/token";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const loginUrl = new URL("/login", request.url);

  if (!token && !isPublicPath) {
    return NextResponse.redirect(loginUrl);
  }

  if (!token) {
    return NextResponse.next();
  }

  try {
    await verifySessionToken(token);

    if (isPublicPath) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = isPublicPath
      ? NextResponse.next()
      : NextResponse.redirect(loginUrl);

    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
