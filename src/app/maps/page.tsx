import { redirect } from "next/navigation";
import { Suspense } from "react";
import { medicalTestingTemplate } from "@/lib/map/template";
import { createJourney, listJourneys } from "@/lib/maps/repository";
import { createClient, getUser } from "@/lib/supabase/server";

export default function MapsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OpenFirstJourney />
    </Suspense>
  );
}

/** Opens the top-ranked journey; a brand new account starts with the template. */
async function OpenFirstJourney(): Promise<never> {
  const user = await getUser();
  if (!user) redirect("/login");
  const db = await createClient();
  const journeys = await listJourneys(db);
  const id = journeys[0]?.id ?? (await createJourney(db, medicalTestingTemplate()));
  redirect(`/maps/${id}`);
}

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center text-sm text-zinc-500">
      Loading your journeys…
    </div>
  );
}
