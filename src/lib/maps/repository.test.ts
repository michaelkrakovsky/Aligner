import { describe, expect, it } from "vitest";
import { medicalTestingTemplate } from "@/lib/map/template";
import { fakeSupabase } from "@/test/fake-supabase";
import {
  createJourney,
  getJourney,
  listJourneys,
  reorderJourneys,
  saveJourney,
} from "./repository";

const ID = "6f1c1d6e-6a52-4c37-9a39-4a1d0b8f6a11";

describe("listJourneys", () => {
  it("returns journeys in stack-rank order", async () => {
    const rows = [
      { id: "a", name: "First" },
      { id: "b", name: "Second" },
    ];
    const { db, queries } = fakeSupabase([{ data: rows }]);

    expect(await listJourneys(db)).toEqual(rows);
    expect(queries[0].calls).toContainEqual(["order", "rank", { ascending: true }]);
  });

  it("throws when Supabase fails", async () => {
    const { db } = fakeSupabase([{ error: { message: "boom" } }]);
    await expect(listJourneys(db)).rejects.toThrow("boom");
  });
});

describe("getJourney", () => {
  it("uses the row's id for the map", async () => {
    const map = medicalTestingTemplate();
    const { db } = fakeSupabase([{ data: { id: ID, name: map.name, data: map } }]);

    const loaded = await getJourney(db, ID);
    expect(loaded?.id).toBe(ID);
    expect(loaded?.nodes).toHaveLength(map.nodes.length);
  });

  it("returns null when the journey doesn't exist or isn't yours", async () => {
    const { db } = fakeSupabase([{ data: null }]);
    expect(await getJourney(db, ID)).toBeNull();
  });

  it("rejects stored data that isn't a valid map", async () => {
    const { db } = fakeSupabase([{ data: { id: ID, name: "x", data: { nodes: 1 } } }]);
    await expect(getJourney(db, ID)).rejects.toThrow();
  });
});

describe("createJourney", () => {
  it("adds the journey below the lowest-ranked one", async () => {
    const { db, queries } = fakeSupabase([{ data: { rank: 4 } }, { data: { id: ID } }]);

    expect(await createJourney(db, medicalTestingTemplate())).toBe(ID);
    const insert = queries[1].calls.find(([m]) => m === "insert")!;
    expect(insert[1]).toMatchObject({ name: "Member journey", rank: 5 });
  });

  it("starts at rank 0 for a first journey", async () => {
    const { db, queries } = fakeSupabase([{ data: null }, { data: { id: ID } }]);

    await createJourney(db, medicalTestingTemplate());
    const insert = queries[1].calls.find(([m]) => m === "insert")!;
    expect(insert[1]).toMatchObject({ rank: 0 });
  });
});

describe("saveJourney", () => {
  it("stores the map and falls back to a name when it's blank", async () => {
    const map = { ...medicalTestingTemplate(), id: ID, name: "  " };
    const { db, queries } = fakeSupabase([{ count: 1 }]);

    await saveJourney(db, map);
    const update = queries[0].calls.find(([m]) => m === "update")!;
    expect(update[1]).toMatchObject({ name: "Untitled journey", data: map });
    expect(queries[0].calls).toContainEqual(["eq", "id", ID]);
  });

  it("fails when no row was updated", async () => {
    const { db } = fakeSupabase([{ count: 0 }]);
    await expect(
      saveJourney(db, { ...medicalTestingTemplate(), id: ID }),
    ).rejects.toThrow("Journey not found");
  });
});

describe("reorderJourneys", () => {
  it("writes each journey's new rank", async () => {
    const { db, queries } = fakeSupabase([{}, {}]);

    await reorderJourneys(db, ["b", "a"]);
    expect(queries.map((q) => q.calls)).toEqual([
      [
        ["update", { rank: 0 }],
        ["eq", "id", "b"],
      ],
      [
        ["update", { rank: 1 }],
        ["eq", "id", "a"],
      ],
    ]);
  });
});
