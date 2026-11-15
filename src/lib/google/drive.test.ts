import { describe, expect, it, vi } from "vitest";
import { LinkedDocSchema } from "@/lib/map/schema";
import { readDocDetails } from "./drive";

const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz";
const NOW = new Date("2026-11-15T12:00:00Z");

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("readDocDetails", () => {
  it("reads a doc's title, link, and last edit with a GET", async () => {
    const fetchMock = stubFetch(200, {
      id: FILE_ID,
      name: "Missing results escalation SOP",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: `https://docs.google.com/document/d/${FILE_ID}/edit`,
      modifiedTime: "2026-11-14T09:30:00Z",
      lastModifyingUser: { displayName: "Dana Ops" },
    });

    const doc = await readDocDetails("access-token", FILE_ID, NOW);
    expect(doc).toEqual({
      type: "google_doc",
      fileId: FILE_ID,
      title: "Missing results escalation SOP",
      url: `https://docs.google.com/document/d/${FILE_ID}/edit`,
      modifiedTime: "2026-11-14T09:30:00Z",
      lastModifiedBy: "Dana Ops",
      syncedAt: "2026-11-15T12:00:00.000Z",
    });
    expect(LinkedDocSchema.safeParse(doc).success).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(`/drive/v3/files/${FILE_ID}?fields=`);
    expect(init.method ?? "GET").toBe("GET");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer access-token");
  });

  it("refuses files that aren't Google Docs", async () => {
    stubFetch(200, {
      id: FILE_ID,
      name: "Budget",
      mimeType: "application/vnd.google-apps.spreadsheet",
      webViewLink: "https://docs.google.com/spreadsheets/d/x",
    });
    await expect(readDocDetails("t", FILE_ID)).rejects.toMatchObject({ reason: "not_a_doc" });
  });

  it("explains missing access and missing files", async () => {
    stubFetch(404, {});
    await expect(readDocDetails("t", FILE_ID)).rejects.toMatchObject({ reason: "not_found" });
    stubFetch(403, {});
    await expect(readDocDetails("t", FILE_ID)).rejects.toMatchObject({ reason: "unauthorized" });
    stubFetch(500, {});
    await expect(readDocDetails("t", FILE_ID)).rejects.toMatchObject({ reason: "failed" });
  });
});
