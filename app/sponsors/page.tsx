import { SponsorsActions } from "@/components/rasa/SponsorsActions";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Sponsors");
import { PageHero } from "@/components/rasa/PageHero";
import { btn, btnLine, lead, wrapTight } from "@/lib/rasa/ui";

export default function SponsorsPage() {
  return (
    <>
      <PageHero title="Sponsors" lead="Added as they come on board." />
      <div className={wrapTight}>
        <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)]">Sponsor RASA</h2>
        <p className={lead}>Read the sponsorship proposal to see how your brand can be part of RASA.</p>
        <SponsorsActions />
        <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">Festival reach</h2>
        <p className={lead}>Planning for 2,400+ visitors across three days.</p>
        <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">Where Your Support Matters</h2>
        <p className={lead}>
          Sponsor support helps cover artist fees, venue, production, sound, lighting, travel, hospitality and festival operations.
        </p>
        <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">Contact for sponsorship</h2>
        <p className={lead}>Mr. Feros Khan, HCG Foundation</p>
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <a className={btn} href="https://wa.me/919663727663" target="_blank" rel="noopener noreferrer">
            WhatsApp HCG Foundation
          </a>
          <a className={btnLine} href="mailto:hcgfoundation@gmail.com">
            hcgfoundation@gmail.com
          </a>
        </div>
        <p className={`${lead} mt-[18px]`}>IHDUA</p>
        <div className="flex flex-wrap gap-2.5">
          <a className={btn} href="https://wa.me/919448363862" target="_blank" rel="noopener noreferrer">
            WhatsApp IHDUA
          </a>
          <a className={btnLine} href="mailto:madhu@ihdua.org">
            madhu@ihdua.org
          </a>
        </div>
      </div>
    </>
  );
}