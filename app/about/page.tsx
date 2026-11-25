import Link from "next/link";
import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Why RASA");
import { btn, card, grid2, grid3, lead, wrapTight } from "@/lib/rasa/ui";

export default function AboutPage() {
  return (
    <>
      <PageHero title="Why RASA" lead="Bhaava is the artist's feeling. Rasa is what it becomes in you." />
      <div className={wrapTight}>
        <div className="max-w-[80ch] rounded-2xl bg-tint p-7 text-[1.15rem]">
          <p className="mb-2.5">
            <b className="text-burg">Bhaava</b> is the emotional state or expression portrayed by the artist through their performance.
          </p>
          <p>
            <b className="text-burg">Rasa</b> is the aesthetic experience or essence savoured by the audience as a result of that artistic expression.
          </p>
        </div>
        <p className={`${lead} mt-7`}>
          A charitable cultural festival bringing together global and local artists to create meaningful collaborations rooted in India&apos;s rich artistic heritage. RASA is an immersive experience that celebrates our traditions while connecting the mind, body and soul.
        </p>
        <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">Four strands</h2>
        <div className={grid2}>
          {[
            ["Music", "Concerts, instrumentalists and contemporary collaborations."],
            ["Dance", "Classical and contemporary movement, for enthusiasts and new audiences alike."],
            ["Wellness", "Sound healing, yoga and immersive experiences that sit alongside the arts."],
            ["Culture", "Art workshops, fusion food and community."],
          ].map(([t, b]) => (
            <div key={t} className={card}>
              <h3>{t}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
        <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">What sets it apart</h2>
        <div className={grid3}>
          {[
            ["Curated", "A journey across music, dance, wellness and culture."],
            ["Immersive", "You can watch, learn, take part and explore within one festival."],
            [
              "Across generations",
              "Classical traditions and contemporary collaborations appeal to a wide audience, with time alongside artists from around the world.",
            ],
          ].map(([t, b]) => (
            <div key={t} className={card}>
              <h3>{t}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
        <p className={`${lead} mt-11`}>Celebrate Art. Celebrate Culture. Celebrate Togetherness. Making a difference.</p>
        <Link href="/team" className={btn}>
          Meet the team
        </Link>
      </div>
    </>
  );
}