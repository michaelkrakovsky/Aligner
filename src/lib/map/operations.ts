import {
  EMPTY_VARIATION,
  type LinkedDoc,
  type MapEdge,
  type MapNode,
  type RealityMap,
  type Role,
} from "./schema";

/**
 * Pure, immutable operations on a reality map. The canvas UI calls these so
 * every rule about how a map can change lives in one testable place.
 */

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const NEW_NODE_OFFSET_X = 280;

export type NewNodeInput = Partial<Omit<MapNode, "id">> & { id?: string };

export function addNode(
  map: RealityMap,
  input: NewNodeInput = {},
  options: { connectFrom?: string; edgeLabel?: string } = {},
): { map: RealityMap; nodeId: string } {
  const from = options.connectFrom
    ? map.nodes.find((n) => n.id === options.connectFrom)
    : undefined;
  const type = input.type ?? "step";
  const node: MapNode = {
    id: input.id ?? createId("node"),
    title: input.title ?? "New step",
    type,
    layer: input.layer ?? from?.layer ?? "digital",
    description: input.description ?? "",
    status: input.status ?? "active",
    ownerRoleId: input.ownerRoleId ?? from?.ownerRoleId ?? null,
    position: input.position ??
      (from
        ? { x: from.position.x + NEW_NODE_OFFSET_X, y: from.position.y }
        : { x: 0, y: 0 }),
    ...(type === "variation"
      ? { variation: input.variation ?? { ...EMPTY_VARIATION } }
      : {}),
  };

  let next: RealityMap = { ...map, nodes: [...map.nodes, node] };
  if (from) {
    next = connect(next, from.id, node.id, options.edgeLabel ?? "");
  }
  return { map: next, nodeId: node.id };
}

export function updateNode(
  map: RealityMap,
  nodeId: string,
  patch: Partial<Omit<MapNode, "id">>,
): RealityMap {
  return {
    ...map,
    nodes: map.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      const updated: MapNode = { ...n, ...patch };
      // Variation details exist exactly when the node is a variation.
      if (updated.type === "variation" && !updated.variation) {
        updated.variation = { ...EMPTY_VARIATION };
      } else if (updated.type !== "variation" && updated.variation) {
        delete updated.variation;
      }
      return updated;
    }),
  };
}

export function moveNodes(
  map: RealityMap,
  positions: Record<string, { x: number; y: number }>,
): RealityMap {
  return {
    ...map,
    nodes: map.nodes.map((n) =>
      positions[n.id] ? { ...n, position: positions[n.id] } : n,
    ),
  };
}

export function removeNode(map: RealityMap, nodeId: string): RealityMap {
  return {
    ...map,
    nodes: map.nodes.filter((n) => n.id !== nodeId),
    edges: map.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
  };
}

export function connect(
  map: RealityMap,
  source: string,
  target: string,
  label = "",
): RealityMap {
  if (source === target) return map;
  const ids = new Set(map.nodes.map((n) => n.id));
  if (!ids.has(source) || !ids.has(target)) return map;
  if (map.edges.some((e) => e.source === source && e.target === target)) {
    return map;
  }
  const edge: MapEdge = { id: createId("edge"), source, target, label };
  return { ...map, edges: [...map.edges, edge] };
}

export function updateEdge(
  map: RealityMap,
  edgeId: string,
  patch: Partial<Pick<MapEdge, "label">>,
): RealityMap {
  return {
    ...map,
    edges: map.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)),
  };
}

export function removeEdge(map: RealityMap, edgeId: string): RealityMap {
  return { ...map, edges: map.edges.filter((e) => e.id !== edgeId) };
}

/**
 * Branch a variation (failure path or workaround) off a happy-path node.
 * The variation is placed below its source and can optionally rejoin the
 * happy path at another node.
 */
export function addVariation(
  map: RealityMap,
  fromId: string,
  input: { title?: string; trigger?: string; rejoinId?: string } = {},
): { map: RealityMap; nodeId: string } {
  const from = map.nodes.find((n) => n.id === fromId);
  if (!from) throw new Error(`Node ${fromId} not found`);
  const siblings = map.edges.filter(
    (e) =>
      e.source === fromId &&
      map.nodes.find((n) => n.id === e.target)?.type === "variation",
  ).length;

  const added = addNode(
    map,
    {
      title: input.title ?? "New variation",
      type: "variation",
      layer: from.layer,
      ownerRoleId: from.ownerRoleId,
      position: {
        x: from.position.x + 40 + siblings * 40,
        y: from.position.y + 160 + siblings * 120,
      },
      variation: { ...EMPTY_VARIATION, trigger: input.trigger ?? "" },
    },
    { connectFrom: fromId, edgeLabel: input.trigger ?? "" },
  );

  let next = added.map;
  if (input.rejoinId) {
    next = connect(next, added.nodeId, input.rejoinId, "rejoins");
  }
  return { map: next, nodeId: added.nodeId };
}

export function addRole(
  map: RealityMap,
  name: string,
): { map: RealityMap; roleId: string } {
  const role: Role = { id: createId("role"), name: name.trim() };
  return { map: { ...map, roles: [...map.roles, role] }, roleId: role.id };
}

export function removeRole(map: RealityMap, roleId: string): RealityMap {
  return {
    ...map,
    roles: map.roles.filter((r) => r.id !== roleId),
    nodes: map.nodes.map((n) =>
      n.ownerRoleId === roleId ? { ...n, ownerRoleId: null } : n,
    ),
  };
}

export type MapIssue = { nodeId: string; message: string };

/**
 * The rules that keep a map honest (PRD section 5). The UI shows these as
 * warnings; publishing will later require them to be clear.
 */
export function validateMap(map: RealityMap): MapIssue[] {
  const issues: MapIssue[] = [];
  const roleIds = new Set(map.roles.map((r) => r.id));
  const connected = new Set(map.edges.flatMap((e) => [e.source, e.target]));

  for (const node of map.nodes) {
    if (node.status === "retired") continue;
    if (!node.title.trim()) {
      issues.push({ nodeId: node.id, message: "Needs a title" });
    }
    if (!node.ownerRoleId || !roleIds.has(node.ownerRoleId)) {
      issues.push({ nodeId: node.id, message: "Needs an owning role" });
    }
    if (map.nodes.length > 1 && !connected.has(node.id)) {
      issues.push({ nodeId: node.id, message: "Not connected to the map" });
    }
    if (node.type === "variation" && node.variation) {
      if (!node.variation.trigger.trim()) {
        issues.push({ nodeId: node.id, message: "Needs a trigger condition" });
      }
      if (!node.variation.sopUrl.trim() && !node.variation.noSopYet) {
        issues.push({
          nodeId: node.id,
          message: 'Link an SOP or mark "no SOP yet"',
        });
      }
    }
  }
  return issues;
}

/** Links a doc to a node, or refreshes its details if it's already linked. */
export function linkDoc(map: RealityMap, nodeId: string, doc: LinkedDoc): RealityMap {
  return {
    ...map,
    nodes: map.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      const docs = n.docs ?? [];
      const exists = docs.some((d) => d.fileId === doc.fileId);
      return {
        ...n,
        docs: exists
          ? docs.map((d) => (d.fileId === doc.fileId ? doc : d))
          : [...docs, doc],
      };
    }),
  };
}

export function unlinkDoc(map: RealityMap, nodeId: string, fileId: string): RealityMap {
  return {
    ...map,
    nodes: map.nodes.map((n) =>
      n.id === nodeId
        ? { ...n, docs: (n.docs ?? []).filter((d) => d.fileId !== fileId) }
        : n,
    ),
  };
}
