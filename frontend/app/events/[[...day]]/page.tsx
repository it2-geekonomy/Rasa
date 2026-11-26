import { Suspense } from "react";
import { EventsRoute } from "@/components/rasa/EventsRoute";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Programme");
import { PageHero } from "@/components/rasa/PageHero";
import type { DayId } from "@/lib/rasa/types";
import { DAYS } from "@/lib/rasa/catalog";

type PageProps = {
  params: Promise<{ day?: string[] }>;
};

export function generateStaticParams() {
  return [{ day: [] }, ...DAYS.map((d) => ({ day: [d.id] }))];
}

export default async function EventsPage({ params }: PageProps) {
  const { day: segments } = await params;
  const raw = segments?.[0];
  const day = (DAYS.some((d) => d.id === raw) ? raw : "fri") as DayId;

  return (
    <Suspense
      fallback={
        <>
          <PageHero title="RASA Festival January 2027" lead="Loading programme…" />
        </>
      }
    >
      <EventsRoute initialDay={day} />
    </Suspense>
  );
}