import { autoLayout } from "./layout";
import { moveNodes } from "./operations";
import type { MapEdge, MapNode, RealityMap } from "./schema";

type TemplateNode = Omit<MapNode, "position" | "status"> & {
  status?: MapNode["status"];
};

const ROLES = [
  { id: "role_product", name: "Product" },
  { id: "role_ops", name: "Facility ops" },
  { id: "role_clinical", name: "Clinical" },
  { id: "role_eng", name: "Engineering" },
  { id: "role_finance", name: "Finance" },
];

const NODES: TemplateNode[] = [
  { id: "start", title: "Member signs up", type: "start", layer: "digital", description: "", ownerRoleId: "role_product" },
  { id: "login", title: "Log in", type: "step", layer: "digital", description: "Member logs in to the patient platform.", ownerRoleId: "role_product" },
  { id: "purchase", title: "Purchase a unit", type: "step", layer: "digital", description: "Member buys a test unit.", ownerRoleId: "role_product" },
  { id: "book", title: "Book a time", type: "step", layer: "digital", description: "Member picks a facility time slot.", ownerRoleId: "role_product" },
  { id: "booking_record", title: "Booking record created", type: "step", layer: "data", description: "Member data platform stores the booking.", ownerRoleId: "role_eng" },
  { id: "visit", title: "Visit the facility", type: "step", layer: "physical", description: "Front desk checks the member in.", ownerRoleId: "role_ops" },
  { id: "test", title: "Get a test", type: "step", layer: "physical", description: "Staff collect the sample.", ownerRoleId: "role_ops" },
  { id: "sample_record", title: "Sample logged and sent to lab", type: "step", layer: "data", description: "Sample is recorded and handed off to the lab.", ownerRoleId: "role_eng" },
  { id: "home", title: "Return home", type: "step", layer: "physical", description: "Member waits for results.", ownerRoleId: "role_ops" },
  { id: "interpret", title: "Clinical interpretation", type: "step", layer: "physical", description: "A clinician reviews the lab result.", ownerRoleId: "role_clinical" },
  { id: "result_record", title: "Result record published", type: "step", layer: "data", description: "The interpreted result is written to the member record.", ownerRoleId: "role_eng" },
  { id: "results", title: "Results land in the account", type: "step", layer: "digital", description: "Member sees results in the app.", ownerRoleId: "role_product" },
  { id: "end", title: "Journey complete", type: "end", layer: "digital", description: "", ownerRoleId: "role_product" },
  {
    id: "complaint", title: "Facility complaint", type: "variation", layer: "physical",
    description: "SOP: Facility complaint handling.", ownerRoleId: "role_ops",
    variation: { trigger: "Member raises a complaint at the facility", severity: "medium", sopUrl: "", noSopYet: false },
  },
  {
    id: "missing", title: "Results never arrive", type: "variation", layer: "physical",
    description: "SOP: Missing results escalation. Clinical is a contributor.", ownerRoleId: "role_ops",
    variation: { trigger: "No result in the account 5 days after the test", severity: "high", sopUrl: "", noSopYet: false },
  },
  {
    id: "confusing", title: "Results do not make sense", type: "variation", layer: "digital",
    description: "SOP: Result clarification call.", ownerRoleId: "role_clinical",
    variation: { trigger: "Member contacts support confused about their results", severity: "medium", sopUrl: "", noSopYet: false },
  },
];

const EDGES: [string, string, string?][] = [
  ["start", "login"],
  ["login", "purchase"],
  ["purchase", "book"],
  ["book", "booking_record"],
  ["booking_record", "visit"],
  ["visit", "test"],
  ["test", "sample_record"],
  ["test", "home"],
  ["sample_record", "interpret"],
  ["interpret", "result_record"],
  ["result_record", "results"],
  ["home", "results", "waits for results"],
  ["results", "end"],
  ["visit", "complaint", "complaint raised"],
  ["complaint", "test", "rejoins"],
  ["interpret", "missing", "no result after 5 days"],
  ["missing", "results", "rejoins"],
  ["results", "confusing", "member confused"],
  ["confusing", "end", "rejoins"],
];

/** The medical testing journey from the PRD, ready to edit. */
export function medicalTestingTemplate(): RealityMap {
  const map: RealityMap = {
    id: "map_member_journey",
    workspaceId: "ws_default",
    name: "Member journey",
    description:
      "From sign up to results, across the patient platform, the test facility, and the member data platform.",
    version: 1,
    roles: ROLES.map((r) => ({ ...r })),
    nodes: NODES.map((n) => ({
      ...n,
      status: n.status ?? "active",
      position: { x: 0, y: 0 },
      ...(n.variation ? { variation: { ...n.variation } } : {}),
    })),
    edges: EDGES.map(
      ([source, target, label]): MapEdge => ({
        id: `e_${source}_${target}`,
        source,
        target,
        label: label ?? "",
      }),
    ),
  };
  return moveNodes(map, autoLayout(map));
}

export function blankMap(): RealityMap {
  return {
    id: "map_new",
    workspaceId: "ws_default",
    name: "Untitled journey",
    description: "",
    version: 1,
    roles: [],
    nodes: [
      {
        id: "start",
        title: "Start",
        type: "start",
        layer: "digital",
        description: "",
        status: "active",
        ownerRoleId: null,
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
  };
}
