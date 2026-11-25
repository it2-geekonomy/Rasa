import Link from "next/link";
import { RasaImage } from "./RasaImage";
import { ContactRow } from "./ContactRow";

export function SiteFooter() {
  return (
    <footer className="bg-plum-d px-6 py-7 text-[0.9rem] text-[#d9bfe0] pb-[calc(28px+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-3.5">
        <div>
          <RasaImage img="logo-white" alt="RASA, Roots to Rhythm" width={900} height={450} className="mb-2 !h-10 !w-auto" />
          <br />
          8 to 10 Jan 2027 · Prestige Centre for Performing Arts, Bengaluru · A fundraiser for HCG Foundation and IHDUA
        </div>
        <div>
          <a className="mr-4 text-[#eadcee] no-underline" href="https://maps.app.goo.gl/ZHzxbwwJcqjcJk3U8" target="_blank" rel="noopener noreferrer">
            Map to PCPA
          </a>
          <Link className="mr-4 text-[#eadcee] no-underline" href="/faq">
            Privacy
          </Link>
          <Link className="mr-4 text-[#eadcee] no-underline" href="/faq">
            Terms
          </Link>
          <Link className="mr-4 text-[#eadcee] no-underline" href="/faq">
            Refunds
          </Link>
          <ContactRow
            contact={{
              ig: "rasarootsrhythm",
              ph: "+91 96637 27663",
              phl: "WhatsApp, contact HCG Foundation",
              em: "rasarootsfestival@gmail.com",
            }}
          />
          <p className="mt-2 text-[#d9bfe0]">
            HCG Foundation: 080 46607760 ·{" "}
            <a href="mailto:hcgfoundation@gmail.com" className="text-[#eadcee]">
              hcgfoundation@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}