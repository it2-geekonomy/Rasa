import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Tickets");
import { card, wrapTight } from "@/lib/rasa/ui";

export default function BookingPage() {
  return (
    <>
      <PageHero title="Tickets" lead="Tickets coming soon." />
      <div className={wrapTight}>
        <div className={card}>
          <h3>Tickets coming soon</h3>
          <p>Ticket details will be shared here once they are confirmed.</p>
        </div>
      </div>
    </>
  );
}