import { Suspense } from "react";
import { PageHero } from "@/components/rasa/PageHero";
import { BookingExperience } from "@/components/rasa/booking/BookingExperience";
import { PageBody } from "@/components/rasa/motion/PageBody";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Tickets");

export default function BookingPage() {
  return (
    <>
      <PageHero
        tight
        title="Tickets"
        lead="Choose an auditorium show, pick your seats on the venue map, then review your cart. Prices shown are indicative for this preview."
      />
      <PageBody>
        <Suspense fallback={<p className="text-muted">Loading tickets…</p>}>
          <BookingExperience />
        </Suspense>
      </PageBody>
    </>
  );
}