import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Stalls");
import { PageBody } from "@/components/rasa/motion/PageBody";
import { card, grid2, wrapTight } from "@/lib/rasa/ui";

export default function StallsPage() {
  return (
    <>
      <PageHero title="Stalls" lead="Stalls to be announced. Details coming soon." />
      <PageBody className={wrapTight}>
        <div className={grid2}>
          <div className={card}>
            <h3>Stalls to be announced</h3>
            <p>Details coming soon.</p>
          </div>
        </div>
      </PageBody>
    </>
  );
}