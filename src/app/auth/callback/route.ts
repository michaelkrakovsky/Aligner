import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google sign in and email confirmation links land. Trades the one-time
 * code for a session cookie, then opens the person's journeys.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  try {
    const supabase = await createClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : { error: new Error("Missing sign in code") };
    if (!error) return NextResponse.redirect(new URL("/maps", request.url));
  } catch {
    // Fall through to the error redirect.
  }
  return NextResponse.redirect(new URL("/login?error=callback", request.url));
}
