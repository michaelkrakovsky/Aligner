/** Server-side settings for connecting Google Docs. */
export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  /** 32 random bytes, base64. Encrypts stored refresh tokens. */
  encryptionKey: string;
};

export function getGoogleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  return clientId && clientSecret && encryptionKey
    ? { clientId, clientSecret, encryptionKey }
    : null;
}

/** Browser-side settings for Google's file picker. Safe to expose. */
export function getPickerConfig(): { apiKey: string; appId: string } | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
  return apiKey && appId ? { apiKey, appId } : null;
}

/**
 * Access to files the person picks (or Aligner creates), and nothing else.
 * Aligner only ever reads with it.
 */
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
