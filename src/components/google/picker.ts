"use client";

/**
 * Google's file picker, loaded on demand from apis.google.com. It shows the
 * person's Docs in Google's own window; whatever they pick is the only file
 * Aligner's drive.file permission can open.
 */

type PickerDoc = { id: string };
type PickerResponse = { action: string; docs?: PickerDoc[] };
type PickerApi = {
  PickerBuilder: new () => PickerBuilder;
  DocsView: new (viewId: string) => DocsView;
  ViewId: { DOCUMENTS: string };
  Action: { PICKED: string; CANCEL: string };
};
type DocsView = { setMode(mode: string): DocsView; setIncludeFolders(v: boolean): DocsView };
type PickerBuilder = {
  addView(view: DocsView): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(appId: string): PickerBuilder;
  setOrigin(origin: string): PickerBuilder;
  setTitle(title: string): PickerBuilder;
  setCallback(cb: (r: PickerResponse) => void): PickerBuilder;
  build(): { setVisible(v: boolean): void };
};
type GapiWindow = Window & {
  gapi?: { load(name: string, cb: () => void): void };
  google?: { picker?: PickerApi };
};

let loading: Promise<PickerApi> | null = null;

function loadPickerApi(): Promise<PickerApi> {
  const w = window as GapiWindow;
  if (w.google?.picker) return Promise.resolve(w.google.picker);
  loading ??= new Promise<PickerApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load Google's file picker."));
    };
    script.onload = () =>
      (window as GapiWindow).gapi!.load("picker", () =>
        resolve((window as GapiWindow).google!.picker!),
      );
    document.head.appendChild(script);
  });
  return loading;
}

/** Shows the picker; resolves to the picked file id, or null if cancelled. */
export async function pickGoogleDoc(options: {
  accessToken: string;
  apiKey: string;
  appId: string;
}): Promise<string | null> {
  const picker = await loadPickerApi();
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCUMENTS).setIncludeFolders(false);
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(options.accessToken)
      .setDeveloperKey(options.apiKey)
      .setAppId(options.appId)
      .setOrigin(window.location.origin)
      .setTitle("Link a Google Doc to this step")
      .setCallback((r) => {
        if (r.action === picker.Action.PICKED) resolve(r.docs?.[0]?.id ?? null);
        else if (r.action === picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}

/**
 * Opens the connect flow in a popup and resolves when it reports back.
 * Must be called straight from a click, or browsers block the popup.
 */
export function connectInPopup(): Promise<"connected" | "not_connected"> {
  const popup = window.open(
    "/api/google/connect",
    "aligner-google-connect",
    "width=520,height=680",
  );
  if (!popup) return Promise.reject(new Error("Allow popups for Aligner to connect Google Docs."));
  return new Promise((resolve) => {
    const finish = (result: "connected" | "not_connected") => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(closedCheck);
      resolve(result);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "aligner:google-connect") return;
      finish(e.data.result === "connected" ? "connected" : "not_connected");
    };
    window.addEventListener("message", onMessage);
    const closedCheck = window.setInterval(() => {
      if (popup.closed) finish("not_connected");
    }, 500);
  });
}
