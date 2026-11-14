import { describe, expect, it } from "vitest";
import { autoLayout, computeLanes, NODE_HEIGHT } from "./layout";
import { moveNodes } from "./operations";
import { medicalTestingTemplate } from "./template";

describe("autoLayout", () => {
  const map = medicalTestingTemplate();
  const pos = autoLayout(map);

  it("positions every node without overlaps", () => {
    expect(Object.keys(pos).sort()).toEqual(map.nodes.map((n) => n.id).sort());
    const keys = new Set(Object.values(pos).map((p) => `${p.x},${p.y}`));
    expect(keys.size).toBe(map.nodes.length);
  });

  it("flows left to right along the happy path", () => {
    const path = ["start", "login", "purchase", "book", "booking_record", "visit", "test"];
    const xs = path.map((id) => pos[id].x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("stacks lanes as Digital, then Physical, then Data", () => {
    expect(pos.login.y).toBeLessThan(pos.visit.y);
    expect(pos.visit.y).toBeLessThan(pos.booking_record.y);
  });

  it("puts variations below the happy path in their lane", () => {
    expect(pos.complaint.y).toBeGreaterThan(pos.visit.y);
    expect(pos.confusing.y).toBeGreaterThan(pos.results.y);
  });
});

describe("computeLanes", () => {
  it("returns one non-overlapping band per layer in use", () => {
    const map = medicalTestingTemplate();
    const lanes = computeLanes(moveNodes(map, autoLayout(map)).nodes);
    expect(lanes.map((l) => l.layer)).toEqual(["digital", "physical", "data"]);
    for (let i = 1; i < lanes.length; i++) {
      expect(lanes[i].y).toBeGreaterThanOrEqual(lanes[i - 1].y + lanes[i - 1].height);
    }
    for (const n of map.nodes) {
      const lane = lanes.find((l) => l.layer === n.layer)!;
      expect(n.position.y).toBeGreaterThanOrEqual(lane.y);
      expect(n.position.y + NODE_HEIGHT).toBeLessThanOrEqual(lane.y + lane.height);
    }
  });

  it("returns nothing for an empty map", () => {
    expect(computeLanes([])).toEqual([]);
  });
});
