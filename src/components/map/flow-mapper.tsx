"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type Connection,
} from "@xyflow/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { autoLayout, computeLanes } from "@/lib/map/layout";
import {
  addNode,
  addVariation,
  connect,
  moveNodes,
  removeEdge,
  removeNode,
  validateMap,
} from "@/lib/map/operations";
import type { RealityMap } from "@/lib/map/schema";
import { loadMap, saveMap } from "@/lib/map/storage";
import { blankMap, medicalTestingTemplate } from "@/lib/map/template";
import {
  LaneNode,
  StepNode,
  type LaneFlowNode,
  type StepFlowNode,
} from "./map-node";
import { EdgePanel, MapPanel, NodePanel } from "./side-panel";

const nodeTypes = { step: StepNode, lane: LaneNode };
const LANE_PREFIX = "lane:";

type Selection =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;
type Size = { width: number; height: number };

function getStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function FlowMapper({ initialMap }: { initialMap?: RealityMap }) {
  return (
    <ReactFlowProvider>
      <FlowMapperInner initialMap={initialMap} />
    </ReactFlowProvider>
  );
}

function FlowMapperInner({ initialMap }: { initialMap?: RealityMap }) {
  const [map, setMap] = useState<RealityMap>(
    () => initialMap ?? loadMap(getStorage()) ?? medicalTestingTemplate(),
  );
  const [selection, setSelection] = useState<Selection>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  // React Flow measures nodes once; keeping the sizes avoids re-measuring
  // (and flickering edges) every time the map re-renders.
  const [measured, setMeasured] = useState<Record<string, Size>>({});
  const { fitView } = useReactFlow();

  useEffect(() => saveMap(getStorage(), map), [map]);

  const update = useCallback(
    (fn: (m: RealityMap) => RealityMap) => setMap((m) => fn(m)),
    [],
  );

  const issues = useMemo(() => validateMap(map), [map]);
  const issuesByNode = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of issues) counts.set(i.nodeId, (counts.get(i.nodeId) ?? 0) + 1);
    return counts;
  }, [issues]);

  const flowNodes = useMemo(() => {
    const roleNames = new Map(map.roles.map((r) => [r.id, r.name]));
    const lanes: LaneFlowNode[] = computeLanes(map.nodes).map((lane) => {
      const id = `${LANE_PREFIX}${lane.layer}`;
      return {
        id,
        type: "lane",
        position: { x: lane.x, y: lane.y },
        width: lane.width,
        height: lane.height,
        data: { layer: lane.layer },
        draggable: false,
        selectable: false,
        focusable: false,
        connectable: false,
        zIndex: -1,
        measured: { width: lane.width, height: lane.height },
      };
    });
    const steps: StepFlowNode[] = map.nodes.map((n) => ({
      id: n.id,
      type: "step",
      position: n.position,
      selected: selection?.kind === "node" && selection.id === n.id,
      data: {
        node: n,
        ownerName: n.ownerRoleId ? (roleNames.get(n.ownerRoleId) ?? null) : null,
        issueCount: issuesByNode.get(n.id) ?? 0,
        dimmed: !!ownerFilter && n.ownerRoleId !== ownerFilter,
      },
      ...(measured[n.id] ? { measured: measured[n.id] } : {}),
    }));
    return [...lanes, ...steps];
  }, [map, selection, ownerFilter, issuesByNode, measured]);

  const flowEdges = useMemo<Edge[]>(() => {
    const types = new Map(map.nodes.map((n) => [n.id, n.type]));
    return map.edges.map((e) => {
      const toVariation = types.get(e.target) === "variation";
      const fromVariation = types.get(e.source) === "variation";
      const variationEdge = toVariation || fromVariation;
      const color = variationEdge ? "#f43f5e" : "#71717a";
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: toVariation ? "b" : "r",
        targetHandle: toVariation ? "t" : "l",
        label: e.label || undefined,
        type: "smoothstep",
        selected: selection?.kind === "edge" && selection.id === e.id,
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: {
          stroke: color,
          strokeWidth: 1.5,
          strokeDasharray: variationEdge ? "6 4" : undefined,
        },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
        labelStyle: { fontSize: 11 },
      };
    });
  }, [map, selection]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const positions: Record<string, { x: number; y: number }> = {};
      const sizes: Record<string, Size> = {};
      const removed: string[] = [];
      for (const c of changes) {
        if ("id" in c && c.id.startsWith(LANE_PREFIX)) continue;
        if (c.type === "position" && c.position) positions[c.id] = c.position;
        if (c.type === "dimensions" && c.dimensions) sizes[c.id] = c.dimensions;
        if (c.type === "remove") removed.push(c.id);
        if (c.type === "select" && c.selected) {
          setSelection({ kind: "node", id: c.id });
        }
      }
      if (Object.keys(sizes).length) setMeasured((m) => ({ ...m, ...sizes }));
      if (Object.keys(positions).length || removed.length) {
        update((m) => {
          let next = moveNodes(m, positions);
          for (const id of removed) next = removeNode(next, id);
          return next;
        });
      }
      if (removed.length) setSelection(null);
    },
    [update],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removed = changes.filter((c) => c.type === "remove").map((c) => c.id);
      for (const c of changes) {
        if (c.type === "select" && c.selected) {
          setSelection({ kind: "edge", id: c.id });
        }
      }
      if (removed.length) {
        update((m) => removed.reduce((acc, id) => removeEdge(acc, id), m));
        setSelection(null);
      }
    },
    [update],
  );

  const onConnect = useCallback(
    (c: Connection) => update((m) => connect(m, c.source, c.target)),
    [update],
  );

  const selectNode = useCallback(
    (id: string) => {
      setSelection({ kind: "node", id });
      void fitView({ nodes: [{ id }], duration: 300, maxZoom: 1.2 });
    },
    [fitView],
  );

  const addStepAfter = useCallback(
    (fromId?: string) => {
      const added = addNode(
        map,
        fromId ? {} : { position: nextFreePosition(map) },
        { connectFrom: fromId },
      );
      setMap(added.map);
      setSelection({ kind: "node", id: added.nodeId });
    },
    [map],
  );

  const addVariationFrom = useCallback(
    (fromId: string) => {
      const added = addVariation(map, fromId);
      setMap(added.map);
      setSelection({ kind: "node", id: added.nodeId });
    },
    [map],
  );

  const runAutoLayout = useCallback(() => {
    update((m) => moveNodes(m, autoLayout(m)));
    window.setTimeout(() => void fitView({ duration: 300 }), 50);
  }, [update, fitView]);

  const replaceMap = useCallback(
    (next: RealityMap, message: string) => {
      if (!window.confirm(message)) return;
      setMap(next);
      setSelection(null);
      setOwnerFilter("");
      window.setTimeout(() => void fitView({ duration: 300 }), 50);
    },
    [fitView],
  );

  const selectedNode =
    selection?.kind === "node"
      ? map.nodes.find((n) => n.id === selection.id)
      : undefined;
  const selectedEdge =
    selection?.kind === "edge"
      ? map.edges.find((e) => e.id === selection.id)
      : undefined;

  const toolbarButton =
    "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Aligner
        </Link>
        <input
          aria-label="Map name"
          value={map.name}
          maxLength={120}
          onChange={(e) => update((m) => ({ ...m, name: e.target.value }))}
          className="min-w-0 rounded-md bg-transparent px-2 py-1 text-lg font-semibold outline-none hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button className={toolbarButton} onClick={() => addStepAfter(selectedNode?.id)}>
            + Step
          </button>
          <button
            className={toolbarButton}
            disabled={!selectedNode}
            title={selectedNode ? undefined : "Select a node to branch from"}
            onClick={() => selectedNode && addVariationFrom(selectedNode.id)}
          >
            + Variation
          </button>
          <button className={toolbarButton} onClick={runAutoLayout}>
            Auto layout
          </button>
          <select
            aria-label="Filter by owner"
            className={toolbarButton}
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          >
            <option value="">All owners</option>
            {map.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Start from"
            className={toolbarButton}
            value=""
            onChange={(e) => {
              const choice = e.target.value;
              e.target.value = "";
              if (choice === "template") {
                replaceMap(
                  medicalTestingTemplate(),
                  "Replace this map with the medical testing template? Your current map will be lost.",
                );
              } else if (choice === "blank") {
                replaceMap(blankMap(), "Start a blank map? Your current map will be lost.");
              }
            }}
          >
            <option value="" disabled>
              New map…
            </option>
            <option value="template">Medical testing template</option>
            <option value="blank">Blank map</option>
          </select>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1" data-testid="map-canvas">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneClick={() => setSelection(null)}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.2}
            colorMode="system"
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} />
            <Controls position="top-left" showInteractive={false} />
            <MiniMap pannable zoomable className="!hidden md:!block" />
          </ReactFlow>
        </div>

        <aside className="flex w-96 shrink-0 flex-col overflow-y-auto border-l border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedNode
              ? selectedNode.title || "Untitled node"
              : selectedEdge
                ? "Connection"
                : "Map overview"}
          </h2>
          {selectedNode ? (
            <NodePanel
              key={selectedNode.id}
              map={map}
              node={selectedNode}
              issues={issues.filter((i) => i.nodeId === selectedNode.id)}
              update={update}
              onAddStep={() => addStepAfter(selectedNode.id)}
              onAddVariation={() => addVariationFrom(selectedNode.id)}
              onDelete={() => {
                update((m) => removeNode(m, selectedNode.id));
                setSelection(null);
              }}
            />
          ) : selectedEdge ? (
            <EdgePanel
              key={selectedEdge.id}
              map={map}
              edge={selectedEdge}
              update={update}
              onDeleted={() => setSelection(null)}
            />
          ) : (
            <MapPanel map={map} issues={issues} update={update} onSelectNode={selectNode} />
          )}
        </aside>
      </div>
    </div>
  );
}

function nextFreePosition(map: RealityMap): { x: number; y: number } {
  if (map.nodes.length === 0) return { x: 0, y: 0 };
  const maxY = Math.max(...map.nodes.map((n) => n.position.y));
  const minX = Math.min(...map.nodes.map((n) => n.position.x));
  return { x: minX, y: maxY + 160 };
}
