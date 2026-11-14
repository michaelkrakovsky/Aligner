import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Signed-out people go to /login; signed-in people skip it. */
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    // Keep any refreshed session cookies.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!signedIn && (pathname === "/" || pathname.startsWith("/maps"))) {
    return redirectTo("/login");
  }
  if (signedIn && (pathname === "/" || pathname === "/login")) {
    return redirectTo("/maps");
  }
  return response;
}

export const config = {
  matcher: ["/", "/login", "/maps/:path*"],
};
