import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { RealityMapSchema, type RealityMap } from "@/lib/map/schema";

/**
 * Reads and writes maps in Supabase. Callers pass a client acting as the
 * signed-in user, so row level security limits every query to their maps.
 */

export type JourneySummary = { id: string; name: string };

const SummaryRow = z.object({ id: z.string(), name: z.string() });
const MapRow = SummaryRow.extend({ data: z.unknown() });

export const UNTITLED = "Untitled journey";

function columnName(map: RealityMap): string {
  return map.name.trim() || UNTITLED;
}

export async function listJourneys(db: SupabaseClient): Promise<JourneySummary[]> {
  const { data, error } = await db
    .from("maps")
    .select("id, name")
    .order("rank", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not list journeys: ${error.message}`);
  return z.array(SummaryRow).parse(data);
}

export async function getJourney(
  db: SupabaseClient,
  id: string,
): Promise<RealityMap | null> {
  const { data, error } = await db
    .from("maps")
    .select("id, name, data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load journey: ${error.message}`);
  if (!data) return null;
  const row = MapRow.parse(data);
  const map = RealityMapSchema.parse(row.data);
  // The row is the source of truth for identity and the listed name.
  return { ...map, id: row.id, name: map.name || row.name };
}

/** Adds a journey at the bottom of the list and returns its id. */
export async function createJourney(
  db: SupabaseClient,
  map: RealityMap,
): Promise<string> {
  const last = await db
    .from("maps")
    .select("rank")
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last.error) throw new Error(`Could not create journey: ${last.error.message}`);
  const rank = last.data ? Number(last.data.rank) + 1 : 0;

  const { data, error } = await db
    .from("maps")
    .insert({ name: columnName(map), rank, data: map })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create journey: ${error.message}`);
  return z.object({ id: z.string() }).parse(data).id;
}

export async function saveJourney(
  db: SupabaseClient,
  map: RealityMap,
): Promise<void> {
  const { error, count } = await db
    .from("maps")
    .update({ name: columnName(map), data: map }, { count: "exact" })
    .eq("id", map.id);
  if (error) throw new Error(`Could not save journey: ${error.message}`);
  if (count === 0) throw new Error("Journey not found");
}

/** Stores a new stack rank: the first id becomes rank 0. */
export async function reorderJourneys(
  db: SupabaseClient,
  ids: string[],
): Promise<void> {
  const results = await Promise.all(
    ids.map((id, rank) => db.from("maps").update({ rank }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(`Could not reorder journeys: ${failed.error.message}`);
  }
}

export async function deleteJourney(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("maps").delete().eq("id", id);
  if (error) throw new Error(`Could not delete journey: ${error.message}`);
}
