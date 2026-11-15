"use server";

import { redirect } from "next/navigation";
import { getGoogleConfig } from "@/lib/google/config";
import {
  deleteGoogleConnection,
  getAccessToken,
  getRefreshToken,
} from "@/lib/google/connections";
import { DocReadError, readDocDetails } from "@/lib/google/drive";
import { GoogleAuthError, revokeToken } from "@/lib/google/oauth";
import { DriveFileIdSchema, type LinkedDoc } from "@/lib/map/schema";
import { createClient, getUser } from "@/lib/supabase/server";

export type TokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "not_configured" | "not_connected" | "failed" };

export type DocResult =
  | { ok: true; doc: LinkedDoc }
  | { ok: false; reason: "not_connected" | "not_found" | "not_a_doc" | "failed"; error: string };

async function signedIn() {
  const user = await getUser();
  if (!user) redirect("/login");
  return { user, db: await createClient() };
}

/**
 * A short-lived token for Google's file picker in the browser. It carries
 * only the drive.file permission: the files this person picks for Aligner.
 */
export async function getPickerTokenAction(): Promise<TokenResult> {
  const config = getGoogleConfig();
  if (!config) return { ok: false, reason: "not_configured" };
  const { db } = await signedIn();
  try {
    const accessToken = await getAccessToken(db, config);
    return accessToken
      ? { ok: true, accessToken }
      : { ok: false, reason: "not_connected" };
  } catch (err) {
    // Google refused the stored token: access was revoked in their account.
    if (err instanceof GoogleAuthError && err.status === 400) {
      return { ok: false, reason: "not_connected" };
    }
    console.error(err);
    return { ok: false, reason: "failed" };
  }
}

/** Reads a picked doc's title, link, and last edit (never its contents). */
export async function readGoogleDocAction(fileId: unknown): Promise<DocResult> {
  const parsed = DriveFileIdSchema.safeParse(fileId);
  if (!parsed.success) {
    return { ok: false, reason: "not_found", error: "That isn't a Google Doc." };
  }
  const token = await getPickerTokenAction();
  if (!token.ok) {
    return {
      ok: false,
      reason: token.reason === "not_connected" ? "not_connected" : "failed",
      error: "Connect Google Docs to link docs.",
    };
  }
  try {
    return { ok: true, doc: await readDocDetails(token.accessToken, parsed.data) };
  } catch (err) {
    if (err instanceof DocReadError) {
      const reason = err.reason === "unauthorized" ? "not_found" : err.reason;
      const error =
        err.reason === "not_a_doc"
          ? "Only Google Docs can be linked for now."
          : err.reason === "failed"
            ? "Google didn't respond. Try again."
            : "Aligner can't open this doc. Pick it again to give access.";
      return { ok: false, reason, error };
    }
    console.error(err);
    return { ok: false, reason: "failed", error: "Google didn't respond. Try again." };
  }
}

/** Revokes Aligner's access at Google and forgets the stored token. */
export async function disconnectGoogleAction(): Promise<void> {
  const config = getGoogleConfig();
  const { user, db } = await signedIn();
  if (config) {
    const refreshToken = await getRefreshToken(db, config).catch(() => null);
    if (refreshToken) await revokeToken(refreshToken).catch(() => undefined);
  }
  await deleteGoogleConnection(db, user.id);
}
