import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getGoogleConfig } from "@/lib/google/config";
import { buildAuthUrl } from "@/lib/google/oauth";
import { STATE_COOKIE, STATE_COOKIE_PATH } from "@/lib/google/state-cookie";
import { getUser } from "@/lib/supabase/server";

/** Starts connecting Google Docs: sends the person to Google's consent screen. */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const config = getGoogleConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/api/google/callback?error=not_configured", request.url),
    );
  }

  const state = randomBytes(24).toString("base64url");
  const redirectUri = new URL("/api/google/callback", request.url).toString();
  const response = NextResponse.redirect(buildAuthUrl(config, redirectUri, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: 600,
  });
  return response;
}
