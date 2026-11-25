import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Workshops");
import { WorkshopsGrid } from "@/components/rasa/WorkshopsGrid";
import { note, wrapTight } from "@/lib/rasa/ui";

export default function WorkshopsPage() {
  return (
    <>
      <PageHero
        title="Workshops"
        lead="Hands-on sessions in the Rehearsal Studio, the Banquet Hall and the Amphitheatre on Saturday and Sunday. Prices are per person. Limited-seat workshops are first come, first served."
      />
      <div className={wrapTight}>
        <WorkshopsGrid />
        <p className={note}>
          Limited-seat workshops are offered on a first come, first served basis. Pricing and registration for Fusion Culinary, Dance Fitness and the organic breakfast will be announced separately.
        </p>
      </div>
    </>
  );
}