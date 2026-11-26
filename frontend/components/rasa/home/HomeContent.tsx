"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "framer-motion";
import { DAYS } from "@/lib/rasa/catalog";
import { EASE_SNAP } from "@/lib/rasa/gsap-presets";
import { card, grid3, gridAnimItem, lead, lnk, wrap } from "@/lib/rasa/ui";
import { ScrollStagger } from "@/components/rasa/motion/ScrollStagger";

type Props = {
  stats: readonly (readonly [number, string])[];
};

const quickLinks = [
  ["/workshops", "Workshops", "Salsa, sound healing, Kalaripayattu, Yoga Raaga, drumming, Meipadam, linocut and more.", "See workshops"],
  ["/artists", "Artists", "The musicians and dancers on the RASA stages.", "Meet the artists"],
  ["/exhibitions", "Art Exhibitions", "Art shows across the festival grounds.", "See the exhibitions"],
  ["/stalls", "Stalls", "Stalls to be announced. Details coming soon.", "See the stalls"],
  ["/partners", "Making a Difference", "Medical care for those in need through HCG Foundation, and women empowerment and education through IHDUA.", "Read more"],
] as const;

function dayChipCls(cls: string) {
  if (cls === "d-sat") return "bg-burg text-white";
  if (cls === "d-sun") return "border-2 border-plum bg-white text-plum";
  return "bg-plum text-white";
}

export function HomeContent({ stats }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const root = wrapRef.current;
    if (!root || reduced) return;

    const ctx = gsap.context(() => {
      const heading = root.querySelector<HTMLElement>("[data-home-intro]");
      const sub = root.querySelector<HTMLElement>("[data-home-intro-sub]");
      if (heading && sub) {
        gsap.set([heading, sub], { autoAlpha: 0, y: 22 });
        ScrollTrigger.create({
          trigger: heading,
          start: "top 88%",
          once: true,
          onEnter: () => {
            gsap.to([heading, sub], {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              stagger: 0.07,
              ease: EASE_SNAP,
            });
          },
        });
      }
    }, root);

    return () => ctx.revert();
  }, [reduced, stats]);

  return (
    <div ref={wrapRef} className={wrap}>
      <h2
        data-home-intro
        className="mb-1 font-display text-[clamp(1.5rem,3vw,2rem)] max-md:text-[1.35rem]"
      >
        Pick a day
      </h2>
      <p data-home-intro-sub className={lead}>
        Tap a day to see its full schedule.
      </p>

      <ScrollStagger className={`${grid3} max-md:gap-4`}>
        {DAYS.map((d) => (
          <div key={d.id} data-scroll-item className={gridAnimItem}>
            <Link href={`/events/${d.id}`} className={`${card} flex h-full min-h-0 flex-col gap-2.5 no-underline`}>
              <div
                className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-[10px] px-3 py-2.5 font-lab text-sm font-semibold uppercase tracking-widest max-md:px-2.5 max-md:py-2 max-md:text-xs ${dayChipCls(d.cls)}`}
              >
                <span>{d.short}</span>
                <b className="font-display text-[1.7rem] normal-case tracking-normal max-md:text-[1.25rem]">
                  {d.num}
                </b>
              </div>
              <h3>{d.title}</h3>
              <ul className="grid list-none gap-1.5 text-[0.98rem] text-muted max-md:gap-1 max-md:text-[0.9rem]">
                {d.pts.map((p) => (
                  <li
                    key={p}
                    className="relative pl-4 before:absolute before:left-0 before:top-[0.55em] before:size-[6px] before:rounded-full before:bg-burg"
                  >
                    {p}
                  </li>
                ))}
              </ul>
              <span className="mt-auto font-bold text-burg max-md:text-[0.92rem]">See the day →</span>
            </Link>
          </div>
        ))}
      </ScrollStagger>

      <section className="mt-10 max-md:mt-8" aria-label="Festival at a glance">
        <ScrollStagger className="grid grid-cols-4 items-stretch gap-3.5 max-md:grid-cols-2 max-md:gap-3">
          {stats.map(([n, label]) => (
            <div key={label} data-scroll-item className={gridAnimItem}>
              <div className="flex h-full flex-col justify-center rounded-xl bg-tint px-4 py-3.5 max-md:px-3 max-md:py-3">
                <b className="font-display text-[2.2rem] leading-none text-plum tabular-nums max-md:text-[1.35rem]">
                  {n}
                </b>
                <span className="mt-1.5 text-[0.92rem] leading-snug text-muted max-md:text-[0.8rem]">
                  {label}
                </span>
              </div>
            </div>
          ))}
        </ScrollStagger>
      </section>

      <ScrollStagger
        className={`${grid3} mt-10 grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] max-md:mt-8 max-md:gap-4`}
      >
        {quickLinks.map(([href, title, body, go]) => (
          <div key={href} data-scroll-item className={gridAnimItem}>
            <Link href={href} className={`${card} flex h-full min-h-0 flex-col gap-2 no-underline`}>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className={`${lnk} mt-auto max-md:text-[0.92rem]`}>{go} →</span>
            </Link>
          </div>
        ))}
      </ScrollStagger>
    </div>
  );
}