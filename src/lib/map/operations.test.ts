import { describe, expect, it } from "vitest";
import {
  addNode,
  addRole,
  addVariation,
  connect,
  removeNode,
  removeRole,
  updateNode,
  validateMap,
} from "./operations";
import { RealityMapSchema, type RealityMap } from "./schema";
import { blankMap, medicalTestingTemplate } from "./template";

function twoNodeMap(): RealityMap {
  const base: RealityMap = {
    ...blankMap(),
    roles: [{ id: "r1", name: "Ops" }],
  };
  base.nodes[0].ownerRoleId = "r1";
  return addNode(base, { id: "b", title: "B" }, { connectFrom: "start" }).map;
}

describe("addNode", () => {
  it("connects to the source and inherits its layer and owner", () => {
    const map = twoNodeMap();
    const b = map.nodes.find((n) => n.id === "b")!;
    expect(b.layer).toBe("digital");
    expect(b.ownerRoleId).toBe("r1");
    expect(b.position.x).toBeGreaterThan(map.nodes[0].position.x);
    expect(map.edges).toEqual([
      expect.objectContaining({ source: "start", target: "b" }),
    ]);
  });
});

describe("connect", () => {
  it("ignores self loops, duplicates, and unknown nodes", () => {
    const map = twoNodeMap();
    expect(connect(map, "b", "b")).toBe(map);
    expect(connect(map, "start", "b")).toBe(map);
    expect(connect(map, "start", "missing")).toBe(map);
    expect(connect(map, "b", "start").edges).toHaveLength(2);
  });
});

describe("removeNode", () => {
  it("removes the node and every edge touching it", () => {
    const map = removeNode(twoNodeMap(), "b");
    expect(map.nodes.map((n) => n.id)).toEqual(["start"]);
    expect(map.edges).toEqual([]);
  });
});

describe("updateNode", () => {
  it("adds variation details when a node becomes a variation and drops them after", () => {
    const asVariation = updateNode(twoNodeMap(), "b", { type: "variation" });
    expect(asVariation.nodes[1].variation).toBeDefined();
    const asStep = updateNode(asVariation, "b", { type: "step" });
    expect(asStep.nodes[1].variation).toBeUndefined();
  });
});

describe("addVariation", () => {
  it("branches a labeled variation off a node and can rejoin", () => {
    const { map, nodeId } = addVariation(twoNodeMap(), "start", {
      title: "Complaint",
      trigger: "member complains",
      rejoinId: "b",
    });
    const v = map.nodes.find((n) => n.id === nodeId)!;
    expect(v.type).toBe("variation");
    expect(v.variation?.trigger).toBe("member complains");
    expect(map.edges).toContainEqual(
      expect.objectContaining({ source: "start", target: nodeId, label: "member complains" }),
    );
    expect(map.edges).toContainEqual(
      expect.objectContaining({ source: nodeId, target: "b", label: "rejoins" }),
    );
  });
});

describe("roles", () => {
  it("removing a role unassigns the nodes it owned", () => {
    const { map, roleId } = addRole(twoNodeMap(), "  Clinical ");
    expect(map.roles.at(-1)).toEqual({ id: roleId, name: "Clinical" });
    const without = removeRole(map, "r1");
    expect(without.nodes.every((n) => n.ownerRoleId === null)).toBe(true);
  });
});

describe("validateMap", () => {
  it("flags unowned, disconnected, and undocumented variations", () => {
    let map = twoNodeMap();
    map = addNode(map, { id: "lonely", ownerRoleId: null }).map;
    map = addVariation(map, "b").map;

    const messages = validateMap(map).map((i) => `${i.nodeId}: ${i.message}`);
    expect(messages).toContain("lonely: Needs an owning role");
    expect(messages).toContain("lonely: Not connected to the map");
    const variation = map.nodes.find((n) => n.type === "variation")!.id;
    expect(messages).toContain(`${variation}: Needs a trigger condition`);
    expect(messages).toContain(`${variation}: Link an SOP or mark "no SOP yet"`);
  });

  it("accepts a variation with an explicit no-SOP flag", () => {
    const added = addVariation(twoNodeMap(), "b", { trigger: "x" });
    const nodeId = added.nodeId;
    const map = updateNode(added.map, nodeId, {
      variation: { trigger: "x", severity: "low", sopUrl: "", noSopYet: true },
    });
    expect(validateMap(map).filter((i) => i.nodeId === nodeId)).toEqual([]);
  });

  it("ignores retired nodes", () => {
    const map = addNode(twoNodeMap(), { status: "retired", ownerRoleId: null }).map;
    expect(validateMap(map)).toEqual([]);
  });
});

describe("medicalTestingTemplate", () => {
  it("is a valid map whose only issues are the SOPs left to link", () => {
    const map = medicalTestingTemplate();
    expect(RealityMapSchema.safeParse(map).success).toBe(true);
    const issues = validateMap(map);
    expect(issues.map((i) => i.nodeId).sort()).toEqual(
      ["complaint", "confusing", "missing"],
    );
  });

  it("covers all three layers and the PRD's three variations", () => {
    const map = medicalTestingTemplate();
    expect(new Set(map.nodes.map((n) => n.layer))).toEqual(
      new Set(["digital", "physical", "data"]),
    );
    expect(
      map.nodes.filter((n) => n.type === "variation").map((n) => n.title),
    ).toEqual([
      "Facility complaint",
      "Results never arrive",
      "Results do not make sense",
    ]);
  });
});
