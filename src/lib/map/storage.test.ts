import { describe, expect, it } from "vitest";
import { loadMap, saveMap, STORAGE_KEY } from "./storage";
import { medicalTestingTemplate } from "./template";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("map storage", () => {
  it("round-trips a map", () => {
    const storage = memoryStorage();
    const map = medicalTestingTemplate();
    saveMap(storage, map);
    expect(loadMap(storage)).toEqual(map);
  });

  it("returns null for missing, corrupt, or invalid data", () => {
    const storage = memoryStorage();
    expect(loadMap(storage)).toBeNull();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(loadMap(storage)).toBeNull();
    storage.setItem(STORAGE_KEY, JSON.stringify({ nodes: "nope" }));
    expect(loadMap(storage)).toBeNull();
    expect(loadMap(undefined)).toBeNull();
  });

  it("never throws when storage is blocked", () => {
    const blocked = {
      ...memoryStorage(),
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as Storage;
    expect(() => saveMap(blocked, medicalTestingTemplate())).not.toThrow();
    expect(loadMap(blocked)).toBeNull();
  });
});
