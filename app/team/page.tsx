import Link from "next/link";
import { PageHero } from "@/components/rasa/PageHero";
import { rasaTitle } from "@/lib/rasa/metadata";

export const metadata = rasaTitle("Team");
import { RasaImage } from "@/components/rasa/RasaImage";
import { card, grid3, lnk, wrapTight } from "@/lib/rasa/ui";

const TEAM = [
  { img: "bsa", alt: "Dr. B.S. Ajaikumar", role: "Festival Patron & Advisor", name: "Dr. B.S. Ajaikumar", body: "Oncologist, Entrepreneur & Founder Chairman, HealthCare Global (HCG) Enterprises Ltd. Festival Patron & Chief Advisor of RASA.", pos: "50% 30%" },
  { img: "aag-team", alt: "Vid. Dr. Aagnika Ajaikumar holding ghungroo, with a stethoscope around her neck", role: "Dancer, Festival Director and Curator", name: "Vid. Dr. Aagnika Ajaikumar", body: "Bharatanatyam dancer and doctor, Festival Director and Curator of RASA.", link: "/artists/aagnika" },
  { img: "sumanth-portrait", alt: "Sumanth Manjunath with his violin", role: "Violinist and Festival Curator", name: "Sumanth Manjunath", body: "A violinist and one of the organisers of RASA, the son and disciple of the violin maestro Dr. Mysore Manjunath. He gave his first concert at the age of eight and has performed in more than 25 countries.", pos: "50% 20%", link: "/artists/sumanth" },
  { img: "vkc-team", alt: "Vrushabh KC", role: "Website designer", name: "Vrushabh KC", body: "AI consultant", pos: "50% 25%" },
  { img: "feros", alt: "Mr. Feros Khan, Festival Curator", role: "Festival Curator", name: "Mr. Feros Khan", body: "Associate Director, HCG Foundation. Sponsors and partner coordination.", pos: "50% 18%" },
  { img: "anitha", alt: "Anitha Niranjan, Festival Advisor", role: "Festival Advisor", name: "Anitha Niranjan", body: "Managing Director of Global Healthcare Academy (GHA).", pos: "50% 72%" },
] as const;

export default function TeamPage() {
  return (
    <>
      <PageHero title="Team" lead="The people organising RASA." />
      <div className={wrapTight}>
        <div className={grid3}>
          {TEAM.map((m) => (
            <div key={m.name} className={card}>
              <RasaImage img={m.img} alt={m.alt} className="mb-3 !aspect-[4/5]" style={{ objectPosition: "pos" in m ? m.pos : "50% 30%" }} width={600} height={750} />
              <div className="font-lab text-sm font-semibold uppercase tracking-wider text-burg">{m.role}</div>
              <h3>{m.name}</h3>
              <p>{m.body}</p>
              {"link" in m && m.link ? (
                <p className="text-[0.9rem] text-muted">
                  <Link href={m.link} className={lnk}>
                    See their page
                  </Link>
                </p>
              ) : null}
            </div>
          ))}
          <AnjaliCard />
          <AjkCard />
        </div>
      </div>
    </>
  );
}

function AnjaliCard() {
  return (
    <div className={card}>
      <RasaImage img="anjali" alt="Anjali Ajaikumar" className="mb-3 !aspect-[4/5]" style={{ objectPosition: "50% 25%" }} width={938} height={1172} />
      <div className="font-lab text-sm font-semibold uppercase tracking-wider text-burg">Organizer</div>
      <h3>Anjali Ajaikumar</h3>
      <details>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-bold text-plum">
          About Anjali
        </summary>
        <p className="text-muted">
          Anjali Ajaikumar is a healthcare leader, strategist and social entrepreneur. She is Director at Healthcare Global Enterprises Ltd. (HCG) and at Milann Fertility &amp; Birthing Hospital, a Board Member and Trustee at Bharath Hospital of Oncology (BHIO), Mysuru, and Director and Trustee at HCG Foundation.
        </p>
        <p className="text-muted">
          With more than 17 years in healthcare administration, strategic leadership and organisational development, she has built centralised functions in quality assurance, clinical excellence, operations and nursing across all 25 HCG centres in India and overseas. She holds an MBA in Entrepreneurship from Babson College, serves on the Board of Advisors of the KMH Center for Health Innovation and Entrepreneurship at Babson, and is Co-founder of Lumos Health Advisory.
        </p>
        <p className="text-muted">
          She champions cancer awareness, has led fundraising for patients facing financial hardship, and is a Trustee of the International Human Development and Upliftment Academy (IHDUA), which supports rural education, women&apos;s empowerment and environmental sustainability.
        </p>
      </details>
    </div>
  );
}

function AjkCard() {
  return (
    <div className={card}>
      <div className="mb-3 grid aspect-[4/5] place-items-center rounded-rasa border border-line bg-white p-[18px]">
        <RasaImage img="ajk-logo" alt="AJK Media logo, tagline Trained to Think" width={900} height={729} className="!h-auto !w-full !rounded-none" />
      </div>
      <h3>AJK Media</h3>
      <p>Social media coverage for RASA, part of the RASA team.</p>
      <details>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-bold text-plum">
          About AJK Media
        </summary>
        <p className="text-muted">
          AJK Media creates stories that make us pause, question, and think better. We believe better thinking leads to better actions, and better actions lead to a better society. Our ultimate goal is to create a better society where equality creates opportunity, and opportunity creates dignity for all.
        </p>
      </details>
    </div>
  );
}