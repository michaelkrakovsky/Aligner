import { z } from "zod";

/** Every node sits in exactly one layer of the business. */
export const LAYERS = ["digital", "physical", "data"] as const;
export const LayerSchema = z.enum(LAYERS);
export type Layer = z.infer<typeof LayerSchema>;

export const LAYER_LABELS: Record<Layer, string> = {
  digital: "Digital",
  physical: "Physical",
  data: "Data",
};

export const NODE_TYPES = [
  "start",
  "step",
  "decision",
  "variation",
  "end",
] as const;
export const NodeTypeSchema = z.enum(NODE_TYPES);
export type NodeType = z.infer<typeof NodeTypeSchema>;

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  start: "Start",
  step: "Step",
  decision: "Decision point",
  variation: "Variation",
  end: "End",
};

export const NODE_STATUSES = ["active", "proposed", "retired"] as const;
export const NodeStatusSchema = z.enum(NODE_STATUSES);
export type NodeStatus = z.infer<typeof NodeStatusSchema>;

export const SEVERITIES = ["low", "medium", "high"] as const;
export const SeveritySchema = z.enum(SEVERITIES);
export type Severity = z.infer<typeof SeveritySchema>;

export const RoleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
});
export type Role = z.infer<typeof RoleSchema>;

/** Details that only apply to variation nodes (failure paths, workarounds). */
export const VariationSchema = z.object({
  trigger: z.string().max(500),
  severity: SeveritySchema,
  /** URL of the SOP that handles this variation. */
  sopUrl: z.string().max(2000),
  /** Explicit "we know there is no SOP yet" flag. */
  noSopYet: z.boolean(),
});
export type Variation = z.infer<typeof VariationSchema>;

/** Google Drive file ids are letters, digits, - and _. */
export const DriveFileIdSchema = z.string().regex(/^[A-Za-z0-9_-]{10,200}$/);

/**
 * A Google Doc linked to a node. Aligner keeps only the link and a few
 * details read from Google (title, last edit); the doc stays in Google.
 */
export const LinkedDocSchema = z.object({
  type: z.literal("google_doc"),
  fileId: DriveFileIdSchema,
  title: z.string().max(300),
  /** Only Google Docs links, so a saved map can never carry a script URL. */
  url: z.url({ protocol: /^https$/, hostname: /^docs\.google\.com$/ }).max(2000),
  modifiedTime: z.string().max(40).nullable(),
  lastModifiedBy: z.string().max(200).nullable(),
  /** When Aligner last read these details from Google (ISO time). */
  syncedAt: z.string().max(40),
});
export type LinkedDoc = z.infer<typeof LinkedDocSchema>;

export const MapNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(120),
  type: NodeTypeSchema,
  layer: LayerSchema,
  description: z.string().max(5000),
  status: NodeStatusSchema,
  /** Owning role id, or null if unassigned. */
  ownerRoleId: z.string().nullable(),
  position: z.object({ x: z.number(), y: z.number() }),
  variation: VariationSchema.optional(),
  /** Linked artifacts; optional so maps saved before this field still load. */
  docs: z.array(LinkedDocSchema).max(50).optional(),
});
export type MapNode = z.infer<typeof MapNodeSchema>;

export const MapEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(120),
});
export type MapEdge = z.infer<typeof MapEdgeSchema>;

export const RealityMapSchema = z.object({
  id: z.string().min(1),
  /** Kept from day one so the app can become multitenant without a rewrite. */
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(5000),
  version: z.number().int().nonnegative(),
  roles: z.array(RoleSchema),
  nodes: z.array(MapNodeSchema),
  edges: z.array(MapEdgeSchema),
});
export type RealityMap = z.infer<typeof RealityMapSchema>;

export const EMPTY_VARIATION: Variation = {
  trigger: "",
  severity: "medium",
  sopUrl: "",
  noSopYet: false,
};
