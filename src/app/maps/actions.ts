"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { RealityMapSchema } from "@/lib/map/schema";
import { blankMap } from "@/lib/map/template";
import {
  createJourney,
  deleteJourney,
  reorderJourneys,
  saveJourney,
} from "@/lib/maps/repository";
import { createClient, getUser } from "@/lib/supabase/server";

// Every action re-checks the session rather than trusting the caller;
// row level security is the second line of defense.
async function signedInClient() {
  const user = await getUser();
  if (!user) redirect("/login");
  return createClient();
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveJourneyAction(map: unknown): Promise<SaveResult> {
  const parsed = RealityMapSchema.safeParse(map);
  if (!parsed.success) return { ok: false, error: "The map has invalid data." };
  const db = await signedInClient();
  try {
    await saveJourney(db, parsed.data);
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Could not save the journey." };
  }
}

export async function createJourneyAction(): Promise<void> {
  const id = await createJourney(await signedInClient(), blankMap());
  redirect(`/maps/${id}`);
}

const Ids = z.array(z.uuid()).max(500);

export async function reorderJourneysAction(ids: unknown): Promise<SaveResult> {
  const parsed = Ids.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const db = await signedInClient();
  try {
    await reorderJourneys(db, parsed.data);
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Could not save the new order." };
  }
}

export async function deleteJourneyAction(id: unknown): Promise<void> {
  const parsed = z.uuid().safeParse(id);
  if (parsed.success) await deleteJourney(await signedInClient(), parsed.data);
  redirect("/maps");
}
