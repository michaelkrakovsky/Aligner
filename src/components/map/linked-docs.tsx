"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleDocIcon } from "@/components/google/google-doc-icon";
import { useGoogleDocs } from "@/components/google/google-docs-context";
import { linkDoc, unlinkDoc } from "@/lib/map/operations";
import type { LinkedDoc, MapNode, RealityMap } from "@/lib/map/schema";
import { timeAgo } from "@/lib/time";

/** Details older than this are re-read from Google when the panel opens. */
const STALE_MS = 10 * 60 * 1000;
const NO_DOCS: LinkedDoc[] = [];

export function LinkedDocs({
  node,
  update,
}: {
  node: MapNode;
  update: (fn: (m: RealityMap) => RealityMap) => void;
}) {
  const google = useGoogleDocs();
  const docs = node.docs ?? NO_DOCS;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep titles and "last edited" current without anyone pressing refresh.
  const refreshed = useRef(new Set<string>());
  useEffect(() => {
    if (!google?.connected) return;
    for (const doc of docs) {
      if (refreshed.current.has(doc.fileId)) continue;
      if (Date.now() - Date.parse(doc.syncedAt) < STALE_MS) continue;
      refreshed.current.add(doc.fileId);
      void google.refreshDoc(doc.fileId).then((fresh) => {
        if (fresh) update((m) => linkDoc(m, node.id, fresh));
      });
    }
  }, [docs, google, node.id, update]);

  async function onLink() {
    if (!google) return;
    setError(null);
    setBusy(true);
    try {
      const doc = await google.pickDoc();
      if (doc) update((m) => linkDoc(m, node.id, doc));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't link that doc.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Linked docs"
      className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Linked docs</h3>
      {docs.length === 0 && (
        <p className="text-sm text-zinc-500">
          Link the SOP or spec for this step so everyone reads the same thing.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {docs.map((doc) => (
          <li key={doc.fileId} className="group flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">
              <GoogleDocIcon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {doc.title || "Untitled document"}
              </a>
              {doc.modifiedTime && (
                <p className="truncate text-xs text-zinc-500">
                  Edited {timeAgo(doc.modifiedTime)}
                  {doc.lastModifiedBy ? ` by ${doc.lastModifiedBy}` : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label={`Unlink ${doc.title}`}
              className="shrink-0 px-1 text-zinc-400 hover:text-rose-600"
              onClick={() => update((m) => unlinkDoc(m, node.id, doc.fileId))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {google?.available ? (
        <div>
          <button
            type="button"
            onClick={onLink}
            disabled={busy}
            className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <GoogleDocIcon size={14} />
            {busy ? "Opening Google…" : "Link a Google Doc"}
          </button>
          {!google.connected && (
            <p className="mt-1.5 text-xs text-zinc-500">
              You&apos;ll be asked to let Aligner read the docs you pick, and nothing else.
            </p>
          )}
        </div>
      ) : (
        google && <p className="text-xs text-zinc-500">Google Docs isn&apos;t set up for Aligner yet.</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
