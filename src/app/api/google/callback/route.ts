import { NextResponse, type NextRequest } from "next/server";
import { getGoogleConfig } from "@/lib/google/config";
import { saveGoogleConnection } from "@/lib/google/connections";
import { exchangeCode, hasDriveFileScope, revokeToken } from "@/lib/google/oauth";
import { STATE_COOKIE, STATE_COOKIE_PATH } from "@/lib/google/state-cookie";
import { createClient, getUser } from "@/lib/supabase/server";

export type ConnectResult = "connected" | "denied" | "not_configured" | "failed";

const MESSAGES: Record<ConnectResult, string> = {
  connected: "Google Docs connected. You can close this window.",
  denied: "Google Docs was not connected. Close this window and try again.",
  not_configured: "Google Docs is not set up for Aligner yet.",
  failed: "Something went wrong connecting Google Docs. Close this window and try again.",
};

/**
 * Google sends the person back here after consent. The connect flow runs in
 * a small popup, so this page tells the Aligner tab the result and closes.
 */
export async function GET(request: NextRequest) {
  const result = await connect(request);
  const response = new NextResponse(resultPage(result), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
  response.cookies.set(STATE_COOKIE, "", { path: STATE_COOKIE_PATH, maxAge: 0 });
  return response;
}

async function connect(request: NextRequest): Promise<ConnectResult> {
  const params = request.nextUrl.searchParams;
  if (params.get("error") === "not_configured") return "not_configured";
  if (params.get("error")) return "denied";

  const config = getGoogleConfig();
  if (!config) return "not_configured";
  const user = await getUser();
  const code = params.get("code");
  const state = params.get("state");
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  if (!user || !code || !state || !expected || state !== expected) return "failed";

  try {
    const redirectUri = new URL("/api/google/callback", request.url).toString();
    const tokens = await exchangeCode(config, code, redirectUri);
    if (!hasDriveFileScope(tokens.scope)) {
      // They unticked the Drive permission on Google's screen.
      await revokeToken(tokens.access_token);
      return "denied";
    }
    if (!tokens.refresh_token) return "failed";
    await saveGoogleConnection(
      await createClient(),
      user.id,
      config,
      tokens.refresh_token,
      tokens.scope,
    );
    return "connected";
  } catch (err) {
    console.error(err);
    return "failed";
  }
}

function resultPage(result: ConnectResult): string {
  // `result` is one of four fixed words, so embedding it is safe.
  return [
    "<!doctype html><html><head><meta charset=\"utf-8\"><title>Aligner</title></head>",
    "<body style=\"font-family:system-ui,sans-serif;padding:32px\">",
    `<p>${MESSAGES[result]}</p>`,
    "<script>",
    "if (window.opener) {",
    `  window.opener.postMessage({ type: "aligner:google-connect", result: "${result}" }, window.location.origin);`,
    "  window.close();",
    "}",
    "</script></body></html>",
  ].join("\n");
}
