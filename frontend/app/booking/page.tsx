import { Suspense } from "react";
import { PageHero } from "@/components/rasa/PageHero";
import { BookingLive } from "@/components/rasa/booking/BookingLive";
import { PageBody } from "@/components/rasa/motion/PageBody";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Tickets");

export default function BookingPage() {
  return (
    <>
      <PageHero
        tight
        title="Tickets"
        lead="Choose an auditorium show, then pick the seats that are open for sale."
      />
      <PageBody>
        <Suspense fallback={<p className="text-muted">Loading tickets…</p>}>
          <BookingLive />
        </Suspense>
      </PageBody>
    </>
  );
}