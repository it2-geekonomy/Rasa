import Link from "next/link";
import { RasaImage } from "./RasaImage";
import { ContactRow } from "./ContactRow";

export function SiteFooter() {
  return (
    <footer className="bg-plum-d px-4 py-8 text-[0.9rem] leading-relaxed text-[#d9bfe0] max-md:pb-[calc(96px+env(safe-area-inset-bottom))] md:px-6 md:py-7 md:pb-[calc(28px+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 md:flex-row md:flex-wrap md:justify-between md:gap-6">
        <div className="max-w-md space-y-2">
          <RasaImage img="logo-white" alt="RASA, Roots to Rhythm" width={900} height={450} className="!h-10 !w-auto" />
          <p className="text-[0.85rem] max-md:text-[0.82rem]">
            8 to 10 Jan 2027 · Prestige Centre for Performing Arts, Bengaluru
          </p>
          <p className="text-[0.85rem] text-[#c9b3d0] max-md:text-[0.82rem]">
            A fundraiser for HCG Foundation and IHDUA
          </p>
        </div>
        <div className="flex flex-col gap-4 md:items-end md:text-right">
          <nav className="flex flex-wrap gap-x-4 gap-y-2 max-md:gap-y-2.5" aria-label="Footer">
            <a
              className="font-medium text-[#eadcee] no-underline hover:underline"
              href="https://maps.app.goo.gl/ZHzxbwwJcqjcJk3U8"
              target="_blank"
              rel="noopener noreferrer"
            >
              Map to PCPA
            </a>
            <Link className="font-medium text-[#eadcee] no-underline hover:underline" href="/faq">
              Privacy
            </Link>
            <Link className="font-medium text-[#eadcee] no-underline hover:underline" href="/faq">
              Terms
            </Link>
            <Link className="font-medium text-[#eadcee] no-underline hover:underline" href="/faq">
              Refunds
            </Link>
          </nav>
          <ContactRow
            contact={{
              ig: "rasarootsrhythm",
              ph: "+91 96637 27663",
              phl: "WhatsApp, contact HCG Foundation",
              em: "rasarootsfestival@gmail.com",
            }}
          />
          <p className="text-[0.82rem] text-[#d9bfe0]">
            HCG Foundation: 080 46607760 ·{" "}
            <a href="mailto:hcgfoundation@gmail.com" className="text-[#eadcee] no-underline hover:underline">
              hcgfoundation@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}