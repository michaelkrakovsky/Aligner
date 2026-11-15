import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { GoogleConfig } from "./config";
import { decryptSecret, encryptSecret } from "./crypto";
import { refreshAccessToken } from "./oauth";

/**
 * A person's Google Docs connection. The client acts as the signed-in user,
 * so row level security keeps each person to their own row.
 */

const Row = z.object({ refresh_token_ciphertext: z.string(), scope: z.string() });

export async function isGoogleConnected(db: SupabaseClient): Promise<boolean> {
  const { data, error } = await db
    .from("google_connections")
    .select("scope")
    .maybeSingle();
  if (error) throw new Error(`Could not check Google connection: ${error.message}`);
  return !!data;
}

export async function saveGoogleConnection(
  db: SupabaseClient,
  userId: string,
  config: GoogleConfig,
  refreshToken: string,
  scope: string,
): Promise<void> {
  const { error } = await db.from("google_connections").upsert({
    owner_id: userId,
    refresh_token_ciphertext: encryptSecret(refreshToken, config.encryptionKey),
    scope,
  });
  if (error) throw new Error(`Could not save Google connection: ${error.message}`);
}

/** The stored refresh token, decrypted, or null when not connected. */
export async function getRefreshToken(
  db: SupabaseClient,
  config: GoogleConfig,
): Promise<string | null> {
  const { data, error } = await db
    .from("google_connections")
    .select("refresh_token_ciphertext, scope")
    .maybeSingle();
  if (error) throw new Error(`Could not load Google connection: ${error.message}`);
  if (!data) return null;
  return decryptSecret(Row.parse(data).refresh_token_ciphertext, config.encryptionKey);
}

/** A fresh, short-lived access token, or null when not connected. */
export async function getAccessToken(
  db: SupabaseClient,
  config: GoogleConfig,
): Promise<string | null> {
  const refreshToken = await getRefreshToken(db, config);
  if (!refreshToken) return null;
  const tokens = await refreshAccessToken(config, refreshToken);
  return tokens.access_token;
}

/** Removes the person's own connection (row level security scopes the delete). */
export async function deleteGoogleConnection(
  db: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await db.from("google_connections").delete().eq("owner_id", userId);
  if (error) throw new Error(`Could not remove Google connection: ${error.message}`);
}
