import dagre from "@dagrejs/dagre";
import { LAYERS, type Layer, type MapNode, type RealityMap } from "./schema";

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 76;

const ROW_GAP = 40;
const LANE_PADDING = 48;
const LANE_GAP = 24;

export type Lane = {
  layer: Layer;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Auto layout: flow runs left to right (dagre decides each node's column),
 * and every node is stacked into the swim lane of its layer.
 * Happy-path nodes sit above variations within a lane.
 */
export function autoLayout(
  map: RealityMap,
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 48 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of map.nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  // Edges leaving a variation (rejoining the happy path) don't drive columns,
  // so a variation sits under the step after its source instead of pushing
  // the happy path further right.
  const variationIds = new Set(
    map.nodes.filter((n) => n.type === "variation").map((n) => n.id),
  );
  for (const e of map.edges) {
    if (!variationIds.has(e.source)) g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  const dagrePos = new Map(
    map.nodes.map((n) => {
      const p = g.node(n.id);
      return [n.id, { x: p.x - NODE_WIDTH / 2, y: p.y }];
    }),
  );

  const positions: Record<string, { x: number; y: number }> = {};
  let laneTop = 0;
  for (const layer of LAYERS) {
    const inLane = map.nodes.filter((n) => n.layer === layer);
    if (inLane.length === 0) continue;

    const columns = new Map<number, MapNode[]>();
    for (const n of inLane) {
      const x = Math.round(dagrePos.get(n.id)!.x);
      columns.set(x, [...(columns.get(x) ?? []), n]);
    }

    // Happy-path rows come first; every variation goes on a row below them,
    // so failure paths read as a separate band within the lane.
    const byY = (a: MapNode, b: MapNode) =>
      dagrePos.get(a.id)!.y - dagrePos.get(b.id)!.y;
    const happyRows = Math.max(
      0,
      ...[...columns.values()].map(
        (ns) => ns.filter((n) => n.type !== "variation").length,
      ),
    );
    let rows = 1;
    for (const [x, nodes] of columns) {
      const happy = nodes.filter((n) => n.type !== "variation").sort(byY);
      const variations = nodes.filter((n) => n.type === "variation").sort(byY);
      const place = (n: MapNode, row: number) => {
        positions[n.id] = {
          x,
          y: laneTop + LANE_PADDING + row * (NODE_HEIGHT + ROW_GAP),
        };
        rows = Math.max(rows, row + 1);
      };
      happy.forEach((n, i) => place(n, i));
      variations.forEach((n, i) => place(n, happyRows + i));
    }

    laneTop +=
      LANE_PADDING * 2 + rows * NODE_HEIGHT + (rows - 1) * ROW_GAP + LANE_GAP;
  }
  return positions;
}

/**
 * Swim lane bands derived from where nodes currently sit, so lanes follow
 * the nodes when someone drags them around.
 */
export function computeLanes(nodes: MapNode[]): Lane[] {
  if (nodes.length === 0) return [];
  const minX = Math.min(...nodes.map((n) => n.position.x)) - LANE_PADDING;
  const maxX =
    Math.max(...nodes.map((n) => n.position.x)) + NODE_WIDTH + LANE_PADDING;

  const lanes: Lane[] = [];
  for (const layer of LAYERS) {
    const inLane = nodes.filter((n) => n.layer === layer);
    if (inLane.length === 0) continue;
    const top = Math.min(...inLane.map((n) => n.position.y)) - LANE_PADDING;
    const bottom =
      Math.max(...inLane.map((n) => n.position.y)) +
      NODE_HEIGHT +
      LANE_PADDING;
    lanes.push({
      layer,
      x: minX - 120,
      y: top,
      width: maxX - minX + 120,
      height: bottom - top,
    });
  }
  return lanes;
}
