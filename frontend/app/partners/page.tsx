import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Make a difference");
import { CopyButton } from "@/components/rasa/CopyButton";
import { RasaImage } from "@/components/rasa/RasaImage";
import { ContactRow } from "@/components/rasa/ContactRow";
import { PageBody } from "@/components/rasa/motion/PageBody";
import { btn, btnLine, card, grid2, wrapTight } from "@/lib/rasa/ui";
import type { ReactNode } from "react";

export default function PartnersPage() {
  return (
    <>
      <PageHero title="Make a difference">
        <p className="mt-2.5 max-w-[720px] text-[1.05rem] text-[#eadcee]">RASA raises funds for these two causes.</p>
      </PageHero>
      <PageBody className={wrapTight}>
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
              <h4 className="mt-2.5 font-display font-semibold text-plum">Online giving (HCG Foundation)</h4>
              <p className="my-2 text-[1.05rem] text-muted">
                Learn about the foundation&apos;s programmes and other ways to give on their website — including online donation options.
              </p>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                <a
                  className={btn}
                  href="https://www.hcgfoundation.org/give-a-gift/index.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Donate online (HCG Foundation)
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
              <h4 className="mt-4 font-display font-semibold text-plum">Online giving (IHDUA)</h4>
              <p className="my-2 text-[1.05rem] text-muted">
                Visit ihdua.org for more on their work and how to contribute online, bank transfer, and other channels.
              </p>
              <IhduaActions />
            </details>
          </div>
        </div>

        <DonatePanel
          heading="Donate to HCG Foundation"
          logo="hcgf-logo"
          logoAlt="HCG Foundation logo"
          websiteHref="https://www.hcgfoundation.org/"
          websiteLabel="hcgfoundation.org"
          qr={
            <RasaImage
              img="upi-qr"
              alt="UPI QR code for HCG Foundation"
              width={720}
              height={722}
              className="!rounded-xl !bg-white w-full max-w-[260px]"
            />
          }
          payTitle="Pay HCG Foundation by UPI"
          payIntro="Scan the QR with any UPI app, or pay to the UPI ID below. The payment goes straight to HCG Foundation."
          upi="30136187344hcgf@sbi"
          note="The QR shows the payee as HCG FOUNDATION."
        />

        <DonatePanel
          heading="Donate to IHDUA"
          logo="ihdua-logo"
          logoAlt="IHDUA logo"
          websiteHref="https://ihdua.org/"
          websiteLabel="ihdua.org"
          qr={
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/ihdua-upi-qr.svg"
              alt="UPI QR code for IHDUA"
              width={228}
              height={228}
              className="w-full max-w-[260px] rounded-xl bg-white"
            />
          }
          payTitle="Pay IHDUA by UPI"
          payIntro="Scan with any UPI app, or pay to the ID below."
          upi="MSINTERNATIONALHUMANDEVELOPMENT.eazypay@icici"
          note="The QR shows the payee as M/S. International Human Development."
        />
      </PageBody>
    </>
  );
}

function DonatePanel({
  heading,
  logo,
  logoAlt,
  websiteHref,
  websiteLabel,
  qr,
  payTitle,
  payIntro,
  upi,
  note,
}: {
  heading: string;
  logo: "hcgf-logo" | "ihdua-logo";
  logoAlt: string;
  websiteHref: string;
  websiteLabel: string;
  qr: ReactNode;
  payTitle: string;
  payIntro: string;
  upi: string;
  note: string;
}) {
  return (
  <>
    <h2 className="mt-11 font-display text-[clamp(1.5rem,3vw,2rem)]">{heading}</h2>
    <section className="grid min-w-0 items-start gap-6 overflow-hidden rounded-2xl bg-tint p-[22px] max-md:grid-cols-1 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <div className="flex justify-center max-md:mx-auto">{qr}</div>
      <div className="min-w-0">
        <div className="mb-4 flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[4.5rem] flex-1 items-center justify-center rounded-xl border border-line bg-white px-4 py-3 shadow-sm transition hover:border-plum/40 hover:shadow-md focus-visible:outline focus-visible:outline-3 focus-visible:outline-burg sm:max-w-[280px] sm:flex-none"
            aria-label={`${logoAlt} — open website in a new tab`}
          >
            <RasaImage
              img={logo}
              alt=""
              width={logo === "hcgf-logo" ? 866 : 291}
              height={logo === "hcgf-logo" ? 313 : 110}
              className="!h-[52px] sm:!h-[56px] !w-auto !rounded-none"
            />
          </a>
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnLine} w-full text-center text-sm sm:w-auto sm:shrink-0`}
          >
            Visit {websiteLabel}
          </a>
        </div>
        <h3 className="font-display text-xl text-plum">{payTitle}</h3>
        <p className="my-2 text-[1.05rem] text-muted">{payIntro}</p>
        <UpiRow upi={upi} note={note} />
      </div>
    </section>
  </>
  );
}

function IhduaActions() {
  return (
    <div className="mt-3.5 flex flex-wrap gap-2.5">
      <a
        className={btn}
        href="https://ihdua.org/#donate"
        target="_blank"
        rel="noopener noreferrer"
      >
        Donate online (IHDUA)
      </a>
      <ContactRow contact={{ ig: "ihduadigital" }} />
    </div>
  );
}

function UpiRow({ upi, note }: { upi: string; note: string }) {
  return (
    <>
      <div className="mt-3.5 flex min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <code className="box-border w-full min-w-0 max-w-full [overflow-wrap:anywhere] break-all rounded-[10px] border border-line bg-white px-3 py-2.5 font-lab text-[0.9rem] font-semibold leading-snug text-plum sm:w-auto sm:max-w-[min(100%,26rem)] md:max-w-[min(100%,30rem)] sm:text-[1.05rem] md:tracking-wide md:text-[1.15rem]">
          {upi}
        </code>
        <CopyButton text={upi} className="w-full shrink-0 sm:w-auto" />
      </div>
      <p className="mt-3.5 text-pretty text-[0.9rem] leading-relaxed text-muted">{note}</p>
    </>
  );
}