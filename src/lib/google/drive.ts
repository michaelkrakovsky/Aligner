import { z } from "zod";
import type { LinkedDoc } from "@/lib/map/schema";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

const DriveFile = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  webViewLink: z.string(),
  modifiedTime: z.string().optional(),
  lastModifyingUser: z.object({ displayName: z.string().optional() }).optional(),
});

export class DocReadError extends Error {
  constructor(
    message: string,
    readonly reason: "not_found" | "not_a_doc" | "unauthorized" | "failed",
  ) {
    super(message);
  }
}

/**
 * Reads a doc's title, link, and last edit from Google Drive. Read-only:
 * a GET for metadata, never the doc's contents, never a write.
 */
export async function readDocDetails(
  accessToken: string,
  fileId: string,
  now: Date = new Date(),
): Promise<LinkedDoc> {
  const fields = "id,name,mimeType,webViewLink,modifiedTime,lastModifyingUser(displayName)";
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}&supportsAllDrives=true`,
    { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  if (res.status === 404) throw new DocReadError("Doc not found or not shared with Aligner", "not_found");
  if (res.status === 401 || res.status === 403) {
    throw new DocReadError("Aligner can't read this doc", "unauthorized");
  }
  if (!res.ok) throw new DocReadError(`Google Drive request failed (${res.status})`, "failed");

  const file = DriveFile.parse(await res.json());
  if (file.mimeType !== GOOGLE_DOC_MIME) {
    throw new DocReadError("That file isn't a Google Doc", "not_a_doc");
  }
  return {
    type: "google_doc",
    fileId: file.id,
    title: file.name.slice(0, 300),
    url: file.webViewLink,
    modifiedTime: file.modifiedTime ?? null,
    lastModifiedBy: file.lastModifyingUser?.displayName?.slice(0, 200) ?? null,
    syncedAt: now.toISOString(),
  };
}
