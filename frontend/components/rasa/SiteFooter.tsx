"use client";

import Link from "next/link";
import { RasaImage } from "./RasaImage";
import { ContactRow } from "./ContactRow";

export function SiteFooter() {
  return (
    <footer className="bg-plum-d px-4 pt-9 pb-7 text-sm leading-relaxed text-[#d9bfe0] max-md:pt-6 max-md:pb-[calc(76px+env(safe-area-inset-bottom))] md:px-6 md:pt-10 md:pb-[calc(28px+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 max-md:gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-2.5">
          <RasaImage img="logo-white" alt="RASA, Roots to Rhythm" width={900} height={450} className="!h-11 !w-auto" />
          <p className="font-medium text-[#f2e8f4]">
            8 to 10 Jan 2027 · Prestige Centre for Performing Arts, Bengaluru
          </p>
          <p className="text-[0.84rem] text-[#c4accb]">
            A fundraiser for HCG Foundation and IHDUA
          </p>
        </div>

        <div className="flex flex-col gap-3.5 md:items-end md:text-right">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[0.9rem]" aria-label="Footer">
            <a
              className="font-medium text-[#f2e8f4] no-underline transition hover:text-white hover:underline"
              href="https://maps.app.goo.gl/ZHzxbwwJcqjcJk3U8"
              target="_blank"
              rel="noopener noreferrer"
            >
              Map to PCPA
            </a>
            <Link className="font-medium text-[#f2e8f4] no-underline transition hover:text-white hover:underline" href="/faq">
              Privacy
            </Link>
            <Link className="font-medium text-[#f2e8f4] no-underline transition hover:text-white hover:underline" href="/faq">
              Terms
            </Link>
            <Link className="font-medium text-[#f2e8f4] no-underline transition hover:text-white hover:underline" href="/faq">
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

          <p className="text-[0.82rem] text-[#c4accb]">
            HCG Foundation:{" "}
            <a href="tel:08046607760" className="font-medium text-[#f2e8f4] no-underline hover:underline">
              080 4660 7760
            </a>
            {" · "}
            <a href="mailto:hcgfoundation@gmail.com" className="font-medium text-[#f2e8f4] no-underline hover:underline">
              hcgfoundation@gmail.com
            </a>
          </p>
        </div>
      </div>

      <div className="mx-auto mt-7 flex max-w-[1240px] flex-col items-start justify-between gap-1.5 border-t border-white/15 pt-4 text-xs tracking-wide text-[#c4accb] max-md:mt-5 sm:flex-row sm:items-center sm:text-[0.82rem]">
        <p>© 2027 RASA · Roots to Rhythm</p>
        <p>
          Developed by{" "}
          <a
            href="https://geekonomy.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#f2e8f4] no-underline transition hover:text-white hover:underline"
          >
            Geekonomy
          </a>
        </p>
      </div>
    </footer>
  );
}