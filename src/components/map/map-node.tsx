"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  LAYER_LABELS,
  NODE_TYPE_LABELS,
  type Layer,
  type MapNode,
} from "@/lib/map/schema";
import { NODE_HEIGHT, NODE_WIDTH } from "@/lib/map/layout";
import { GoogleDocIcon } from "@/components/google/google-doc-icon";

export const LAYER_STYLES: Record<
  Layer,
  { stripe: string; lane: string; text: string }
> = {
  digital: {
    stripe: "bg-sky-500",
    lane: "bg-sky-50/70 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900",
    text: "text-sky-700 dark:text-sky-300",
  },
  physical: {
    stripe: "bg-emerald-500",
    lane: "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  data: {
    stripe: "bg-violet-500",
    lane: "bg-violet-50/70 border-violet-200 dark:bg-violet-950/30 dark:border-violet-900",
    text: "text-violet-700 dark:text-violet-300",
  },
};

export type StepNodeData = {
  node: MapNode;
  ownerName: string | null;
  issueCount: number;
  dimmed: boolean;
};
export type StepFlowNode = Node<StepNodeData, "step">;

const handleClass = "!h-2.5 !w-2.5 !border-2 !border-white !bg-zinc-400";

export function StepNode({ data, selected }: NodeProps<StepFlowNode>) {
  const { node, ownerName, issueCount, dimmed } = data;
  const isVariation = node.type === "variation";
  const isTerminal = node.type === "start" || node.type === "end";
  const docCount = node.docs?.length ?? 0;
  const style = LAYER_STYLES[node.layer];

  return (
    <div
      data-testid={`map-node-${node.id}`}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
      className={[
        "relative flex overflow-hidden border bg-white text-left shadow-sm transition-opacity dark:bg-zinc-900",
        isTerminal ? "rounded-full" : "rounded-lg",
        isVariation
          ? "border-dashed border-rose-400 dark:border-rose-500"
          : "border-zinc-300 dark:border-zinc-700",
        selected ? "ring-2 ring-zinc-900 dark:ring-white" : "",
        node.status === "proposed" ? "opacity-70" : "",
        node.status === "retired" ? "opacity-40 grayscale" : "",
        dimmed ? "!opacity-20" : "",
      ].join(" ")}
    >
      <Handle id="t" type="target" position={Position.Top} className={handleClass} />
      <Handle id="l" type="target" position={Position.Left} className={handleClass} />
      {!isTerminal && (
        <div className={`w-1.5 shrink-0 ${isVariation ? "bg-rose-400" : style.stripe}`} />
      )}
      <div className={`flex min-w-0 flex-1 flex-col justify-center gap-1 py-2 ${isTerminal ? "px-5" : "px-3"}`}>
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
          <span className={isVariation ? "text-rose-600 dark:text-rose-400" : style.text}>
            {NODE_TYPE_LABELS[node.type]}
          </span>
          <span className="text-zinc-400">·</span>
          <span className="text-zinc-500">{LAYER_LABELS[node.layer]}</span>
          {node.status !== "active" && (
            <span className="ml-auto rounded bg-zinc-100 px-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {node.status}
            </span>
          )}
        </div>
        <div className="truncate text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
          {node.title || "Untitled"}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="truncate">{ownerName ?? "No owner"}</span>
          {docCount > 0 && (
            <span
              data-testid={`map-node-docs-${node.id}`}
              title={`Linked: ${node.docs!.map((d) => d.title || "Untitled document").join(", ")}`}
              className="ml-auto flex shrink-0 items-center gap-0.5"
            >
              <GoogleDocIcon size={13} />
              {docCount > 1 && (
                <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                  {docCount}
                </span>
              )}
            </span>
          )}
          {issueCount > 0 && (
            <span
              title={`${issueCount} issue${issueCount === 1 ? "" : "s"}`}
              className={`${docCount > 0 ? "" : "ml-auto "}shrink-0 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200`}
            >
              ! {issueCount}
            </span>
          )}
        </div>
      </div>
      <Handle id="r" type="source" position={Position.Right} className={handleClass} />
      <Handle id="b" type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

export type LaneNodeData = { layer: Layer };
export type LaneFlowNode = Node<LaneNodeData, "lane">;

export function LaneNode({ data, width, height }: NodeProps<LaneFlowNode>) {
  const style = LAYER_STYLES[data.layer];
  return (
    <div
      style={{ width, height }}
      className={`pointer-events-none rounded-xl border ${style.lane}`}
    >
      <span className={`absolute left-4 top-3 text-xs font-semibold uppercase tracking-[0.2em] ${style.text}`}>
        {LAYER_LABELS[data.layer]}
      </span>
    </div>
  );
}
