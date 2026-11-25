import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Artists");
import { ArtistsGrid } from "@/components/rasa/ArtistsGrid";
import { wrapTight } from "@/lib/rasa/ui";

export default function ArtistsPage() {
  return (
    <>
      <PageHero
        title="Artists"
        lead="The musicians, dancers and artists on the RASA stages. More are added as they confirm."
      />
      <div className={wrapTight}>
        <ArtistsGrid />
      </div>
    </>
  );
}