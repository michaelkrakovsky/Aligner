"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/login/actions";
import { createJourneyAction, deleteJourneyAction } from "@/app/maps/actions";
import type { JourneySummary } from "@/lib/maps/repository";
import { moveItem } from "@/lib/maps/rank";

const iconButton =
  "rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

export function JourneySidebar({
  journeys,
  activeId,
  email,
  onReorder,
  error,
}: {
  journeys: JourneySummary[];
  activeId: string;
  email: string | null;
  onReorder: (next: JourneySummary[]) => void;
  error?: string | null;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    const next = moveItem(journeys, from, to);
    if (next !== journeys) onReorder(next);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="px-4 pb-3 pt-4">
        <Link href="/maps" className="text-xl font-semibold tracking-tight">
          Aligner
        </Link>
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Journeys
        </h2>
        <form action={createJourneyAction}>
          <NewJourneyButton />
        </form>
      </div>

      <ol aria-label="Journeys, in priority order" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
        {journeys.map((j, i) => {
          const active = j.id === activeId;
          return (
            <li
              key={j.id}
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(i);
              }}
              onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={[
                "group flex items-center gap-2 rounded-md pr-1 text-sm",
                active
                  ? "bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                overIndex === i && dragIndex !== i ? "ring-2 ring-sky-400" : "",
                dragIndex === i ? "opacity-50" : "",
              ].join(" ")}
            >
              <span className="w-6 shrink-0 cursor-grab select-none text-right text-xs tabular-nums text-zinc-400">
                {i + 1}
              </span>
              <Link
                href={`/maps/${j.id}`}
                aria-current={active ? "page" : undefined}
                className="min-w-0 flex-1 truncate py-1.5"
              >
                {j.name || "Untitled journey"}
              </Link>
              <span className="hidden shrink-0 items-center group-focus-within:flex group-hover:flex">
                <button
                  type="button"
                  aria-label={`Move ${j.name} up`}
                  className={iconButton}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${j.name} down`}
                  className={iconButton}
                  disabled={i === journeys.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  ↓
                </button>
                <form
                  action={deleteJourneyAction.bind(null, j.id)}
                  onSubmit={(e) => {
                    if (!window.confirm(`Delete "${j.name}"? This can't be undone.`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <button type="submit" aria-label={`Delete ${j.name}`} className={`${iconButton} hover:!text-rose-600`}>
                    ×
                  </button>
                </form>
              </span>
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="mx-3 mb-2 rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-zinc-200 px-4 py-3 text-xs dark:border-zinc-800">
        <span className="min-w-0 flex-1 truncate text-zinc-500" title={email ?? undefined}>
          {email ?? "Signed in"}
        </span>
        <form action={signOut}>
          <button type="submit" className="font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function NewJourneyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {pending ? "Creating…" : "+ New"}
    </button>
  );
}
