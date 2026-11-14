"use client";

import dynamic from "next/dynamic";

/**
 * The map lives in browser storage for now, so render it only in the
 * browser to avoid a server/client mismatch.
 */
export const FlowMapperLoader = dynamic(
  () => import("./flow-mapper").then((m) => m.FlowMapper),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center text-sm text-zinc-500">
        Loading map…
      </div>
    ),
  },
);
