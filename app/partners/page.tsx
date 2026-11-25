import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Make a difference");
import { CopyButton } from "@/components/rasa/CopyButton";
import { RasaImage } from "@/components/rasa/RasaImage";
import { ContactRow } from "@/components/rasa/ContactRow";
import { btn, btnLine, card, grid2, lead, wrapTight } from "@/lib/rasa/ui";

export default function PartnersPage() {
  return (
    <>
      <PageHero title="Make a difference">
        <PartnerLogos />
        <p className="mt-2.5 max-w-[720px] text-[1.05rem] text-[#eadcee]">RASA raises funds for these two causes.</p>
      </PageHero>
      <div className={wrapTight}>
        <div className={grid2}>
          <div className={card}>
            <h3>Medical Care for Those in Need</h3>
            <p>Funds raised at RASA support HCG Foundation.</p>
            <details className="mt-3.5">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-bold text-plum">
                About HCG Foundation
              </summary>
              <p className="text-muted">Ensure access to quality cancer treatment for those in need. Create greater awareness about cancer and its prevention.</p>
              <p className="text-muted">
                At RASA, the foundation shows curated art displays on Saturday and Sunday, about art for healing, community and social impact, and Aroghya hosts the organic food breakfast on Sunday. Aroghya restaurant is part of the HCG group of hospitals.
              </p>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                <a className={btn} href="https://www.hcgfoundation.org/" target="_blank" rel="noopener noreferrer">
                  HCG Foundation website
                </a>
                <a className={btnLine} href="https://wa.me/919663727663" target="_blank" rel="noopener noreferrer">
                  WhatsApp HCG Foundation
                </a>
              </div>
              <ContactRow contact={{ ig: "hcg_foundation" }} />
            </details>
          </div>
          <div className={card}>
            <h3>Women Empowerment and education</h3>
            <p>Skill training, self-help groups, model villages &amp; education around Mysore and Gundlupet districts.</p>
            <details className="mt-3.5">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-bold text-plum">
                About IHDUA
              </summary>
              <h4 className="mt-2.5 font-display font-semibold text-plum">International Human Development and Upliftment Academy (IHDUA)</h4>
              <p className="text-muted">
                A non-profit based in Mysore and Gundlupet, established in 1991 and founded by Dr. B S Ajaikumar. It works on rural education, women&apos;s empowerment, skill development and model villages, with around 500 self-help groups today.
              </p>
              <IhduaActions />
            </details>
          </div>
        </div>
        <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">Donate to HCG Foundation</h2>
        <div className="grid items-center gap-6 rounded-2xl bg-tint p-[22px] max-md:grid-cols-1 md:grid-cols-[minmax(0,230px)_minmax(0,1fr)]">
          <RasaImage img="upi-qr" alt="UPI QR code for HCG Foundation" width={720} height={722} className="!rounded-xl !bg-white max-md:max-w-[260px]" />
          <div>
            <h3 className="font-display text-xl text-plum">Pay HCG Foundation by UPI</h3>
            <p className="my-2 text-[1.05rem] text-muted">
              Scan the QR with any UPI app, or pay to the UPI ID below. The payment goes straight to HCG Foundation.
            </p>
            <UpiRow upi="30136187344hcgf@sbi" note="The QR shows the payee as HCG FOUNDATION." />
          </div>
        </div>
        <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">Donate to IHDUA</h2>
        <div className="grid items-center gap-6 rounded-2xl bg-tint p-[22px] max-md:grid-cols-1 md:grid-cols-[minmax(0,230px)_minmax(0,1fr)]">
          <p className="text-muted max-md:col-span-full">
            Use the UPI ID below (same as on the handover site). Full IHDUA QR is embedded in the legacy static file at{" "}
            <a href="/rasa.html#/partners" className="font-bold text-burg">
              rasa.html
            </a>{" "}
            if you need the exact graphic.
          </p>
          <div className="max-md:col-span-full">
            <h3 className="font-display text-xl text-plum">Pay IHDUA by UPI</h3>
            <p className="my-2 text-[1.05rem] text-muted">Scan with any UPI app, or pay to the ID below.</p>
            <UpiRow
              upi="MSINTERNATIONALHUMANDEVELOPMENT.eazypay@icici"
              note="The QR shows the payee as M/S. International Human Development."
            />
          </div>
        </div>
      </div>
    </>
  );
}

function PartnerLogos() {
  return (
    <div className="mt-[18px] flex flex-wrap gap-3.5">
      <a
        href="https://www.hcgfoundation.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-24 min-w-[min(240px,100%)] flex-1 items-center justify-center rounded-rasa bg-white px-5 py-3"
        aria-label="HCG Foundation website (opens in a new tab)"
      >
        <RasaImage img="hcgf-logo" alt="HCG Foundation logo" width={866} height={313} className="!h-[72px] !w-auto !rounded-none" />
      </a>
      <a
        href="https://ihdua.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-24 min-w-[min(240px,100%)] flex-1 items-center justify-center rounded-rasa bg-white px-5 py-3"
        aria-label="IHDUA website (opens in a new tab)"
      >
        <RasaImage img="ihdua-logo" alt="IHDUA logo" width={291} height={110} className="!h-[72px] !w-auto !rounded-none" />
      </a>
    </div>
  );
}

function IhduaActions() {
  return (
    <div className="mt-3.5 flex flex-wrap gap-2.5">
      <a className={btn} href="https://ihdua.org/" target="_blank" rel="noopener noreferrer">
        IHDUA website
      </a>
      <ContactRow contact={{ ig: "ihduadigital" }} />
    </div>
  );
}

function UpiRow({ upi, note }: { upi: string; note: string }) {
  return (
    <>
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <code className="overflow-wrap-anywhere rounded-[10px] border border-line bg-white px-3 py-2 font-lab text-[1.15rem] font-semibold tracking-wide text-plum">
          {upi}
        </code>
        <CopyButton text={upi} />
      </div>
      <p className="mt-3.5 text-[0.9rem] text-muted">{note}</p>
    </>
  );
}