import { z } from "zod";
import { DRIVE_FILE_SCOPE, type GoogleConfig } from "./config";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export function buildAuthUrl(
  config: Pick<GoogleConfig, "clientId">,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_FILE_SCOPE,
    // A refresh token lets Aligner re-read doc details later.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

const TokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string(),
});
export type Tokens = z.infer<typeof TokenResponse>;

async function postToken(body: Record<string, string>): Promise<Tokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new GoogleAuthError(`Google token request failed (${res.status})`, res.status);
  return TokenResponse.parse(await res.json());
}

export class GoogleAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function exchangeCode(config: GoogleConfig, code: string, redirectUri: string) {
  return postToken({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
}

export function refreshAccessToken(config: GoogleConfig, refreshToken: string) {
  return postToken({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
}

/** True when every scope Aligner needs was granted. */
export function hasDriveFileScope(scope: string): boolean {
  return scope.split(" ").includes(DRIVE_FILE_SCOPE);
}
