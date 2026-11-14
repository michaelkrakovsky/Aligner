import { describe, expect, it } from "vitest";
import { moveItem } from "./rank";

describe("moveItem", () => {
  it("moves an item up or down", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });

  it("clamps the target and ignores no-op moves", () => {
    const items = ["a", "b"];
    expect(moveItem(items, 0, 9)).toEqual(["b", "a"]);
    expect(moveItem(items, 1, 1)).toBe(items);
    expect(moveItem(items, 5, 0)).toBe(items);
  });
});
