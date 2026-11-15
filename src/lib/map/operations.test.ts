import { describe, expect, it } from "vitest";
import {
  addNode,
  addRole,
  addVariation,
  connect,
  linkDoc,
  unlinkDoc,
  removeNode,
  removeRole,
  updateNode,
  validateMap,
} from "./operations";
import { LinkedDocSchema, RealityMapSchema, type RealityMap } from "./schema";
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

describe("linked docs", () => {
  const doc = {
    type: "google_doc" as const,
    fileId: "1AbCdEfGhIjKlMnOp",
    title: "Facility complaint SOP",
    url: "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/edit",
    modifiedTime: "2026-11-14T09:30:00Z",
    lastModifiedBy: "Dana Ops",
    syncedAt: "2026-11-15T12:00:00Z",
  };

  it("links a doc once and refreshes it in place", () => {
    let map = linkDoc(twoNodeMap(), "b", doc);
    map = linkDoc(map, "b", { ...doc, title: "Renamed SOP" });
    const b = map.nodes.find((n) => n.id === "b")!;
    expect(b.docs).toEqual([{ ...doc, title: "Renamed SOP" }]);
    expect(map.nodes.find((n) => n.id === "start")!.docs).toBeUndefined();
  });

  it("unlinks a doc", () => {
    const map = unlinkDoc(linkDoc(twoNodeMap(), "b", doc), "b", doc.fileId);
    expect(map.nodes.find((n) => n.id === "b")!.docs).toEqual([]);
  });

  it("still loads maps saved before docs existed", () => {
    const old = JSON.parse(JSON.stringify(twoNodeMap()));
    expect(RealityMapSchema.safeParse(old).success).toBe(true);
    expect(RealityMapSchema.safeParse(linkDoc(old, "b", doc)).success).toBe(true);
  });

  it("rejects a doc link that isn't a URL", () => {
    const bad = linkDoc(twoNodeMap(), "b", { ...doc, url: "javascript:alert(1)" });
    expect(RealityMapSchema.safeParse(bad).success).toBe(false);
  });
});

describe("linked doc URLs", () => {
  it("accept only https Google Docs links", () => {
    const base = {
      type: "google_doc" as const,
      fileId: "1AbCdEfGhIjKlMnOp",
      title: "SOP",
      modifiedTime: null,
      lastModifiedBy: null,
      syncedAt: "2026-11-15T12:00:00Z",
    };
    const ok = (url: string) => LinkedDocSchema.safeParse({ ...base, url }).success;
    expect(ok("https://docs.google.com/document/d/1AbCdEfGhIjKlMnOp/edit")).toBe(true);
    expect(ok("http://docs.google.com/document/d/x")).toBe(false);
    expect(ok("https://evil.example/document/d/x")).toBe(false);
    expect(ok("javascript:alert(1)")).toBe(false);
  });
});
