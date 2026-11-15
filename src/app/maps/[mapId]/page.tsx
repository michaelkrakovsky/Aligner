import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Workspace } from "@/components/workspace/workspace";
import { isGoogleConnected } from "@/lib/google/connections";
import { getJourney, listJourneys } from "@/lib/maps/repository";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Journeys · Aligner",
};

export default function JourneyPage({ params }: PageProps<"/maps/[mapId]">) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-zinc-500">
          Loading journey…
        </div>
      }
    >
      <Journey params={params} />
    </Suspense>
  );
}

async function Journey({ params }: { params: Promise<{ mapId: string }> }) {
  const { mapId } = await params;
  if (!z.uuid().safeParse(mapId).success) notFound();

  const user = await getUser();
  if (!user) redirect("/login");
  const db = await createClient();
  const [journeys, map, googleConnected] = await Promise.all([
    listJourneys(db),
    getJourney(db, mapId),
    // Until the Google table exists, act as not connected rather than fail.
    isGoogleConnected(db).catch(() => false),
  ]);
  if (!map) notFound();

  return (
    <Workspace
      key={map.id}
      journeys={journeys}
      map={map}
      email={user.email}
      googleConnected={googleConnected}
    />
  );
}
