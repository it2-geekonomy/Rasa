import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Festival Venue");
import { PageBody } from "@/components/rasa/motion/PageBody";
import { RasaImage } from "@/components/rasa/RasaImage";
import { VenueGallery } from "@/components/rasa/VenueGallery";
import { btn, card, grid2, grid3, note, wrapTight } from "@/lib/rasa/ui";

export default function VenuePage() {
  return (
    <>
      <PageHero title="Festival Venue" lead="Prestige Centre for Performing Arts (PCPA), Bengaluru. 8 to 10 January 2027." />
      <PageBody className={wrapTight}>
        <div className={grid2}>
          <div className={card}>
            <h3>Address</h3>
            <p>
              Prestige Centre for Performing Arts (PCPA)
              <br />
              Konanakunte Cross, Kanakapura Road, J.P. Nagar
              <br />
              Bengaluru, Karnataka 560062
            </p>
            <p>Next to Forum South Bengaluru. Konanakunte Cross metro station on the Green Line serves the venue.</p>
            <p>
              <a className={btn} href="https://maps.app.goo.gl/ZHzxbwwJcqjcJk3U8" target="_blank" rel="noopener noreferrer">
                Open the map
              </a>
            </p>
          </div>
          <div className={card}>
            <h3>Scan the venue QR code</h3>
            <div className="my-1.5 max-w-[280px]">
              <RasaImage img="pcpa-qr" alt="QR code for the PCPA venue" width={600} height={600} className="!rounded-xl !bg-white" />
            </div>
            <p className={note}>Point your phone camera at the code.</p>
          </div>
        </div>
        <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">Where things happen</h2>
        <div className={`${grid3} mt-2.5`}>
          <div className={card}>
            <h3>Auditorium</h3>
            <p>The evening performances: Three Forces, One Stage and Agam on Friday, the Saturday performances and Fusion Express, and the Sunday finale.</p>
          </div>
          <div className={card}>
            <h3>Amphitheatre</h3>
            <p>The inauguration, the Sunday discussion and Nritya Naada. Studio 3 by day on Sunday: dance fitness, the organic breakfast and the health talk.</p>
          </div>
          <div className={card}>
            <h3>Rehearsal Studio and Banquet Hall</h3>
            <p>Workshops. Studio 1 is the Rehearsal Studio and Studio 2 is the Banquet Hall. The Banquet Hall also hosts the Swasti Gallery art exhibition.</p>
          </div>
        </div>
        <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">Photos of the venue</h2>
        <VenueGallery />
      </PageBody>
    </>
  );
}