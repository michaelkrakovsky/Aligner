import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn(async () => ({})),
  saveGoogleConnection: vi.fn(async () => undefined),
  exchangeCode: vi.fn(),
  revokeToken: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  getUser: mocks.getUser,
  createClient: mocks.createClient,
}));
vi.mock("@/lib/google/connections", () => ({
  saveGoogleConnection: mocks.saveGoogleConnection,
}));
vi.mock("@/lib/google/oauth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/google/oauth")>()),
  exchangeCode: mocks.exchangeCode,
  revokeToken: mocks.revokeToken,
}));

import { DRIVE_FILE_SCOPE } from "@/lib/google/config";
import { STATE_COOKIE } from "@/lib/google/state-cookie";
import { GET } from "./route";

function callback(query: string, cookieState?: string) {
  return new NextRequest(`https://aligner.test/api/google/callback?${query}`, {
    headers: cookieState ? { cookie: `${STATE_COOKIE}=${cookieState}` } : {},
  });
}

async function resultOf(res: Response) {
  return (await res.text()).match(/result: "(\w+)"/)?.[1];
}

beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32).toString("base64"));
  mocks.getUser.mockResolvedValue({ id: "user-1", email: null });
});

describe("Google callback", () => {
  it("saves the connection when state matches and Drive access was granted", async () => {
    mocks.exchangeCode.mockResolvedValue({
      access_token: "at",
      refresh_token: "rt",
      expires_in: 3599,
      scope: DRIVE_FILE_SCOPE,
    });

    const res = await GET(callback("code=abc&state=s1", "s1"));

    expect(await resultOf(res)).toBe("connected");
    expect(mocks.exchangeCode).toHaveBeenCalledWith(
      expect.anything(),
      "abc",
      "https://aligner.test/api/google/callback",
    );
    expect(mocks.saveGoogleConnection).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.anything(),
      "rt",
      DRIVE_FILE_SCOPE,
    );
  });

  it("refuses a state that doesn't match the cookie", async () => {
    const res = await GET(callback("code=abc&state=attacker", "s1"));
    expect(await resultOf(res)).toBe("failed");
    expect(mocks.exchangeCode).not.toHaveBeenCalled();
    expect(mocks.saveGoogleConnection).not.toHaveBeenCalled();
  });

  it("refuses when nobody is signed in", async () => {
    mocks.getUser.mockResolvedValue(null);
    const res = await GET(callback("code=abc&state=s1", "s1"));
    expect(await resultOf(res)).toBe("failed");
    expect(mocks.saveGoogleConnection).not.toHaveBeenCalled();
  });

  it("revokes and stores nothing when Drive access was unticked", async () => {
    mocks.exchangeCode.mockResolvedValue({
      access_token: "at",
      refresh_token: "rt",
      expires_in: 3599,
      scope: "openid",
    });
    const res = await GET(callback("code=abc&state=s1", "s1"));
    expect(await resultOf(res)).toBe("denied");
    expect(mocks.revokeToken).toHaveBeenCalledWith("at");
    expect(mocks.saveGoogleConnection).not.toHaveBeenCalled();
  });

  it("reports when the person declines on Google's screen", async () => {
    const res = await GET(callback("error=access_denied&state=s1", "s1"));
    expect(await resultOf(res)).toBe("denied");
  });

  it("clears the state cookie", async () => {
    const res = await GET(callback("error=access_denied"));
    expect(res.headers.get("set-cookie")).toContain(`${STATE_COOKIE}=;`);
  });
});
