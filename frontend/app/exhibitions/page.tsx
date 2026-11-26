import Link from "next/link";
import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Art Exhibitions");
import { PageBody } from "@/components/rasa/motion/PageBody";
import { card, grid2, lnk, wrapTight } from "@/lib/rasa/ui";

export default function ExhibitionsPage() {
  return (
    <>
      <PageHero title="Art Exhibitions" lead="Art on show across the festival grounds. Entry to the art shows is free." />
      <PageBody className={wrapTight}>
        <div className={grid2}>
          <div className={card}>
            <div className="font-lab text-sm font-semibold uppercase tracking-wider text-burg">Fri 8 Jan, Welcome Area</div>
            <h3>TANDAV Art Show</h3>
            <p>By Artist Bhagya Ajaikumar.</p>
            <p>Abstract prints and sculptures bringing together colour, movement and Indian artistic expression. Displayed on Friday, opening day, in the Welcome Area. All are welcome.</p>
            <p>
              <Link href="/artists/bhagya" className={lnk}>
                About Artist Bhagya Ajaikumar
              </Link>
            </p>
          </div>
          <div className={card}>
            <div className="font-lab text-sm font-semibold uppercase tracking-wider text-burg">Sat 9 Jan, 6 to 8 PM</div>
            <h3>Art Exhibition by Swasti Gallery (HCG Foundation)</h3>
            <p>In the Banquet Hall. Open for all.</p>
            <p>
              The art gallery of HCG Foundation.{" "}
              <a className={lnk} href="https://www.hcgfoundation.org/swasti-art-gallery" target="_blank" rel="noopener noreferrer">
                Swasti Art Gallery at HCG Foundation
              </a>{" "}
              ·{" "}
              <a className={lnk} href="https://www.instagram.com/swasti_gallery/" target="_blank" rel="noopener noreferrer">
                Swasti Gallery on Instagram
              </a>
            </p>
          </div>
        </div>
      </PageBody>
    </>
  );
}