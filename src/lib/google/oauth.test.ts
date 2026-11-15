import { describe, expect, it, vi } from "vitest";
import { DRIVE_FILE_SCOPE } from "./config";
import {
  buildAuthUrl,
  exchangeCode,
  GoogleAuthError,
  hasDriveFileScope,
  refreshAccessToken,
} from "./oauth";

const config = { clientId: "client-id", clientSecret: "client-secret", encryptionKey: "k" };

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("buildAuthUrl", () => {
  it("asks only for access to files the person picks", () => {
    const url = new URL(buildAuthUrl(config, "https://app.test/api/google/callback", "st8"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("scope")).toBe(DRIVE_FILE_SCOPE);
    expect(url.searchParams.get("state")).toBe("st8");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.test/api/google/callback");
  });
});

describe("token requests", () => {
  it("exchanges a code for tokens", async () => {
    const fetchMock = stubFetch(200, {
      access_token: "at",
      expires_in: 3599,
      refresh_token: "rt",
      scope: DRIVE_FILE_SCOPE,
    });

    const tokens = await exchangeCode(config, "the-code", "https://app.test/cb");
    expect(tokens.refresh_token).toBe("rt");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init.body as URLSearchParams);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("the-code");
  });

  it("refreshes an access token", async () => {
    const fetchMock = stubFetch(200, { access_token: "new", expires_in: 3599, scope: DRIVE_FILE_SCOPE });

    expect((await refreshAccessToken(config, "rt")).access_token).toBe("new");
    const body = new URLSearchParams((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams);
    expect(body.get("grant_type")).toBe("refresh_token");
  });

  it("reports Google's status when a request fails", async () => {
    stubFetch(400, { error: "invalid_grant" });
    const error = await refreshAccessToken(config, "revoked").catch((e) => e);
    expect(error).toBeInstanceOf(GoogleAuthError);
    expect(error.status).toBe(400);
  });
});

describe("hasDriveFileScope", () => {
  it("checks the granted scopes", () => {
    expect(hasDriveFileScope(`openid ${DRIVE_FILE_SCOPE}`)).toBe(true);
    expect(hasDriveFileScope("openid email")).toBe(false);
  });
});
