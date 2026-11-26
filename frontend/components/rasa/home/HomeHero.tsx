"use client";

import Link from "next/link";
import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "framer-motion";
import { Countdown } from "@/components/rasa/Countdown";
import { RasaImage } from "@/components/rasa/RasaImage";
import { EASE_GLIDE, EASE_POP, EASE_SNAP } from "@/lib/rasa/gsap-presets";
import { btn, btnGhost, lab } from "@/lib/rasa/ui";

export function HomeHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const root = sectionRef.current;
    if (!root || reduced) return;

    gsap.set("[data-hero-line]", { autoAlpha: 0, y: 18 });
    gsap.set("[data-hero-logo]", {
      autoAlpha: 0,
      scale: 0.88,
      y: 12,
      clipPath: "inset(100% 0 0 0)",
    });
    gsap.set("[data-hero-img]", { autoAlpha: 0, y: 22, scale: 0.96 });
  }, [reduced]);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root || reduced) return;

    const ctx = gsap.context(() => {
      const lines = gsap.utils.toArray<HTMLElement>("[data-hero-line]", root);
      const [firstLine, ...restLines] = lines;
      const imgs = gsap.utils.toArray<HTMLElement>("[data-hero-img]", root);

      const tl = gsap.timeline();

      if (firstLine) {
        tl.to(firstLine, {
          autoAlpha: 1,
          y: 0,
          duration: 0.4,
          ease: EASE_SNAP,
        });
      }

      tl.to(
        "[data-hero-logo]",
        {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          clipPath: "inset(0% 0 0 0)",
          duration: 0.78,
          ease: EASE_POP,
          onComplete: () => {
            gsap.set("[data-hero-logo]", { clearProps: "clipPath,transform" });
          },
        },
        firstLine ? "-=0.08" : 0,
      );

      if (restLines.length) {
        tl.to(
          restLines,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.055,
            ease: EASE_GLIDE,
          },
          "-=0.4",
        );
      }

      if (imgs.length) {
        tl.to(
          imgs,
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.58,
            stagger: 0.07,
            ease: EASE_SNAP,
            clearProps: "transform",
          },
          "-=0.35",
        );
      }
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={sectionRef} className="overflow-hidden bg-plum text-white">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[1.05fr_0.95fr] items-center gap-9 px-6 py-12 max-md:grid-cols-1 max-md:gap-5 max-md:px-4 max-md:py-6">
        <div className="min-w-0 w-full max-md:flex max-md:flex-col max-md:items-center max-md:text-center">
          <p
            className={`${lab} text-[#f2c9d0] max-md:max-w-[34ch] max-md:text-[0.65rem] max-md:leading-snug max-md:tracking-[0.05em]`}
            data-hero-line
          >
            8 to 10 January 2027 · Prestige Centre for Performing Arts (PCPA), Bengaluru
          </p>
          <h1
            className="herologo mb-2 mt-2 w-full max-w-[380px] max-md:mx-auto max-md:max-w-[min(58vw,220px)]"
            data-hero-logo
          >
            <RasaImage
              img="logo-white"
              alt="RASA, Roots to Rhythm"
              width={900}
              height={450}
              className="!h-auto !w-full"
              priority
            />
          </h1>
          <p
            className="mt-3 max-w-[46ch] text-[1.08rem] leading-relaxed text-[#eadcee] max-md:mx-auto max-md:mt-2 max-md:max-w-[36ch] max-md:text-[0.88rem] max-md:leading-relaxed"
            data-hero-line
          >
            An integrated celebration of music, dance, and wellness, bringing together the richness
            of Indian traditions and the diversity of Western cultures. A three-day festival united
            by a purpose to make a difference.
          </p>
          <div
            className="mt-5 flex w-full flex-col items-stretch gap-2 max-md:mx-auto max-md:max-w-[min(100%,15.5rem)] max-md:items-center sm:flex-row sm:flex-wrap sm:justify-start sm:gap-2.5"
            data-hero-line
          >
            <Link href="/booking" className={`${btn} w-full justify-center sm:w-auto`}>
              Book tickets
            </Link>
            <Link
              href="/events"
              className={`${btnGhost} w-full justify-center border-white text-white sm:w-auto`}
            >
              See the programme
            </Link>
          </div>
          <div className="max-md:flex max-md:w-full max-md:justify-center" data-hero-line>
            <Suspense fallback={<div className="mt-4 h-7" />}>
              <Countdown />
            </Suspense>
          </div>
        </div>
        <div className="min-w-0 w-full max-md:mt-2">
          <div className="grid grid-cols-2 gap-2.5">
            <div data-hero-img className="col-span-2 overflow-hidden rounded-[14px]">
              <RasaImage
                img="agam-hero"
                alt="Agam Band"
                className="!aspect-[3/2] !rounded-[14px]"
                width={1600}
                height={1067}
              />
            </div>
            <div data-hero-img className="overflow-hidden rounded-[14px]">
              <RasaImage
                img="lab-pink"
                alt="Labonee Mohanta in a Kathak spin, pink costume"
                className="!aspect-square !rounded-[14px]"
                style={{ objectPosition: "50% 25%" }}
                width={1600}
                height={1597}
              />
            </div>
            <div data-hero-img className="overflow-hidden rounded-[14px]">
              <RasaImage
                img="banjo-live"
                alt="Banjo Rancho playing drums on stage"
                className="!aspect-square !rounded-[14px]"
                width={1400}
                height={933}
              />
            </div>
          </div>
          <p className="mt-2 text-[0.8rem] text-[#d9bfe0]">
            Agam Band, Labonee Mohanta and Banjo Rancho.
          </p>
        </div>
      </div>
    </section>
  );
}