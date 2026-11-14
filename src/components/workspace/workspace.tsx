"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reorderJourneysAction, saveJourneyAction } from "@/app/maps/actions";
import { FlowMapper } from "@/components/map/flow-mapper";
import type { RealityMap } from "@/lib/map/schema";
import type { JourneySummary } from "@/lib/maps/repository";
import { JourneySidebar } from "./journey-sidebar";

const SAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 5000;

type SaveStatus = "saved" | "saving" | "error";

/** The signed-in app: ranked journeys on the left, the open map on the right. */
export function Workspace({
  journeys: initialJourneys,
  map,
  email,
}: {
  journeys: JourneySummary[];
  map: RealityMap;
  email: string | null;
}) {
  const [journeys, setJourneys] = useState(initialJourneys);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [sidebarError, setSidebarError] = useState<string | null>(null);

  // Debounced save: the latest unsaved map waits here until typing pauses.
  const pending = useRef<RealityMap | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    setStatus("saving");
    const result = await saveJourneyAction(next);
    // A newer edit may have arrived while saving; it will report its own status.
    if (pending.current) return;
    if (result.ok) {
      setStatus("saved");
    } else {
      setStatus("error");
      pending.current = next;
      timer.current = window.setTimeout(() => void flushRef.current(), RETRY_DELAY_MS);
    }
  }, []);
  const flushRef = useRef(flush);

  const onChange = useCallback(
    (next: RealityMap) => {
      pending.current = next;
      setStatus("saving");
      setJourneys((list) =>
        list.map((j) => (j.id === next.id ? { ...j, name: next.name } : j)),
      );
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      // Switching journeys: save whatever is still waiting.
      void flush();
    };
  }, [flush]);

  const onReorder = useCallback(
    async (next: JourneySummary[]) => {
      const previous = journeys;
      setJourneys(next);
      setSidebarError(null);
      const result = await reorderJourneysAction(next.map((j) => j.id));
      if (!result.ok) {
        setJourneys(previous);
        setSidebarError(result.error);
      }
    },
    [journeys],
  );

  return (
    <div className="flex h-screen">
      <JourneySidebar
        journeys={journeys}
        activeId={map.id}
        email={email}
        onReorder={onReorder}
        error={sidebarError}
      />
      <FlowMapper
        initialMap={map}
        onChange={onChange}
        status={<SaveIndicator status={status} />}
      />
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const text = {
    saved: "Saved",
    saving: "Saving…",
    error: "Couldn't save",
  }[status];
  return (
    <span
      role="status"
      className={`w-24 text-right text-xs ${
        status === "error" ? "text-rose-600" : "text-zinc-500"
      }`}
    >
      {text}
    </span>
  );
}
