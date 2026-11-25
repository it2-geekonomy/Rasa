import Link from "next/link";
import { Suspense } from "react";
import { Countdown } from "@/components/rasa/Countdown";
import { RasaImage } from "@/components/rasa/RasaImage";
import { DAYS, EV } from "@/lib/rasa/catalog";
import { rasaTitle } from "@/lib/rasa/metadata";
import { btn, btnGhost, card, grid3, lab, lead, lnk, wrap } from "@/lib/rasa/ui";

export const metadata = rasaTitle("Home");

export default function HomePage() {
  const real = EV.filter((e) => e.ty !== "brk");
  const stats = [
    [real.length, "scheduled slots across three days"],
    [real.filter((e) => e.ws).length, "workshops and hands-on sessions"],
    [real.filter((e) => e.ty === "perf").length, "performances and talks"],
    [2, "causes supported"],
  ] as const;

  return (
  <>
    <section className="overflow-hidden bg-plum text-white">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[1.05fr_0.95fr] items-center gap-9 px-6 py-12 max-md:grid-cols-1 max-md:gap-5 max-md:px-[18px] max-md:py-7">
        <div>
          <div className={`${lab} text-[#f2c9d0]`}>
            8 to 10 January 2027 · Prestige Centre for Performing Arts (PCPA), Bengaluru
          </div>
          <h1 className="herologo mb-1.5 max-w-[380px]">
            <RasaImage img="logo-white" alt="RASA, Roots to Rhythm" width={900} height={450} className="!h-auto !w-full" priority />
          </h1>
          <p className="mt-4 max-w-[46ch] text-[1.08rem] text-[#eadcee]">
            An integrated celebration of music, dance, and wellness, bringing together the richness of Indian traditions and the diversity of Western cultures. A Three Day festival united by a purpose to make a difference.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/booking" className={btn}>Tickets coming soon</Link>
            <Link href="/events" className={`${btnGhost} border-white text-white`}>See the programme</Link>
          </div>
          <Suspense fallback={<div className="mt-5 h-8" />}>
            <Countdown />
          </Suspense>
        </div>
        <div>
          <HeroMosaic />
          <p className="mt-2 text-[0.8rem] text-[#d9bfe0]">Agam Band, Labonee Mohanta and Banjo Rancho.</p>
        </div>
      </div>
    </section>
    <HomeWrap>
      <h2 className="mb-2.5 font-display text-[clamp(1.5rem,3vw,2rem)]">Pick a day</h2>
      <p className={lead}>Tap a day to see its full schedule.</p>
      <DayCards />
      <div className="mt-11">
        <div className="grid grid-cols-4 gap-3.5 max-md:grid-cols-2">
          {stats.map(([n, label]) => (
            <div key={label} className="rounded-rasa bg-tint px-[18px] py-4">
              <b className="block font-display text-[2.2rem] leading-none text-plum">{n}</b>
              <span className="text-[0.92rem] text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`${grid3} mt-11 grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))]`}>
        {[
          ["/workshops", "Workshops", "Salsa, sound healing, Kalaripayattu, Yoga Raaga, drumming, Meipadam, linocut and more.", "See workshops"],
          ["/artists", "Artists", "The musicians and dancers on the RASA stages.", "Meet the artists"],
          ["/exhibitions", "Art Exhibitions", "Art shows across the festival grounds.", "See the exhibitions"],
          ["/stalls", "Stalls", "Stalls to be announced. Details coming soon.", "See the stalls"],
          ["/partners", "Making a Difference", "Medical care for those in need through HCG Foundation, and women empowerment and education through IHDUA.", "Read more"],
        ].map(([href, title, body, go]) => (
          <Link key={href} href={href} className={`${card} flex flex-col gap-2.5 no-underline`}>
            <h3>{title}</h3>
            <p>{body}</p>
            <span className={`${lnk} mt-auto`}>{go}</span>
          </Link>
        ))}
      </div>
    </HomeWrap>
  </>
  );
}

function dayChipCls(cls: string) {
  if (cls === "d-sat") return "bg-burg text-white";
  if (cls === "d-sun") return "border-2 border-plum bg-white text-plum";
  return "bg-plum text-white";
}

function HeroMosaic() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <RasaImage img="agam-hero" alt="Agam Band" className="col-span-2 !aspect-[3/2] !rounded-[14px]" width={1600} height={1067} />
      <RasaImage img="lab-pink" alt="Labonee Mohanta in a Kathak spin, pink costume" className="!aspect-square !rounded-[14px]" style={{ objectPosition: "50% 25%" }} width={1600} height={1597} />
      <RasaImage img="banjo-live" alt="Banjo Rancho playing drums on stage" className="!aspect-square !rounded-[14px]" width={1400} height={933} />
    </div>
  );
}

function HomeWrap({ children }: { children: React.ReactNode }) {
  return <div className={wrap}>{children}</div>;
}

function DayCards() {
  return (
    <div className={grid3}>
      {DAYS.map((d) => (
        <Link key={d.id} href={`/events/${d.id}`} className={`${card} flex flex-col gap-2.5 no-underline`}>
          <div className={`flex items-baseline gap-2.5 rounded-[10px] px-3.5 py-2.5 font-lab text-sm font-semibold uppercase tracking-widest ${dayChipCls(d.cls)}`}>
            <span>{d.short}</span>
            <b className="font-display text-[1.7rem] normal-case tracking-normal">{d.num}</b>
          </div>
          <h3>{d.title}</h3>
          <ul className="grid list-none gap-1.5 text-[0.98rem] text-muted">
            {d.pts.map((p) => (
              <li key={p} className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:size-[7px] before:rounded-full before:bg-burg">
                {p}
              </li>
            ))}
          </ul>
          <span className="mt-auto font-bold text-burg">See the day</span>
        </Link>
      ))}
    </div>
  );
}