"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  disconnectGoogleAction,
  getPickerTokenAction,
  readGoogleDocAction,
} from "@/app/maps/google-actions";
import type { LinkedDoc } from "@/lib/map/schema";
import { connectInPopup, pickGoogleDoc } from "./picker";

export type GoogleDocsApi = {
  /** Google Docs is set up for this deployment. */
  available: boolean;
  connected: boolean;
  /** Connects if needed, then opens the picker. Null = cancelled. Throws a message on failure. */
  pickDoc(): Promise<LinkedDoc | null>;
  /** Re-reads a linked doc's details. Null when it can't be read right now. */
  refreshDoc(fileId: string): Promise<LinkedDoc | null>;
  disconnect(): Promise<void>;
};

const GoogleDocsContext = createContext<GoogleDocsApi | null>(null);

/** Null outside a provider (e.g. tests), so callers hide Google features. */
export function useGoogleDocs(): GoogleDocsApi | null {
  return useContext(GoogleDocsContext);
}

export function GoogleDocsProvider({
  initiallyConnected,
  children,
}: {
  initiallyConnected: boolean;
  children: ReactNode;
}) {
  const [connected, setConnected] = useState(initiallyConnected);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
  const available = !!apiKey && !!appId;

  const pickDoc = useCallback(async (): Promise<LinkedDoc | null> => {
    if (!apiKey || !appId) throw new Error("Google Docs isn't set up for Aligner yet.");
    if (!connected) {
      // Opened straight from the click so the browser allows the popup.
      const result = await connectInPopup();
      if (result !== "connected") return null;
      setConnected(true);
    }
    const token = await getPickerTokenAction();
    if (!token.ok) {
      if (token.reason === "not_connected") {
        setConnected(false);
        throw new Error("Google access was removed. Click again to reconnect.");
      }
      throw new Error(
        token.reason === "not_configured"
          ? "Google Docs isn't set up for Aligner yet."
          : "Couldn't reach Google. Try again.",
      );
    }
    const fileId = await pickGoogleDoc({ accessToken: token.accessToken, apiKey, appId });
    if (!fileId) return null;
    const result = await readGoogleDocAction(fileId);
    if (!result.ok) throw new Error(result.error);
    return result.doc;
  }, [apiKey, appId, connected]);

  const refreshDoc = useCallback(async (fileId: string) => {
    const result = await readGoogleDocAction(fileId);
    if (!result.ok && result.reason === "not_connected") setConnected(false);
    return result.ok ? result.doc : null;
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectGoogleAction();
    setConnected(false);
  }, []);

  const value = useMemo(
    () => ({ available, connected, pickDoc, refreshDoc, disconnect }),
    [available, connected, pickDoc, refreshDoc, disconnect],
  );
  return <GoogleDocsContext value={value}>{children}</GoogleDocsContext>;
}
