import { RealityMapSchema, type RealityMap } from "./schema";

/**
 * Browser storage for the map until Supabase lands. Every read is validated,
 * and storage failures (private mode, blocked site data) never break the app.
 */
export const STORAGE_KEY = "aligner.map.v1";

export function loadMap(storage: Storage | undefined): RealityMap | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = RealityMapSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveMap(storage: Storage | undefined, map: RealityMap): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage full or blocked: the map still works for this session.
  }
}
