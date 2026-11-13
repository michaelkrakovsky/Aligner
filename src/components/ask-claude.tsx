"use client";

import { useState } from "react";

export function AskClaude() {
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sayHello() {
    setLoading(true);
    setReply(null);
    try {
      const res = await fetch("/api/hello", { method: "POST" });
      const data = await res.json();
      setReply(data.text ?? data.error);
    } catch {
      setReply("Could not reach the API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <button
        onClick={sayHello}
        disabled={loading}
        className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Asking Claude..." : "Say hello to Claude"}
      </button>
      {reply && (
        <p className="rounded-xl border border-zinc-200 p-4 text-center text-sm dark:border-zinc-800">
          {reply}
        </p>
      )}
    </div>
  );
}
