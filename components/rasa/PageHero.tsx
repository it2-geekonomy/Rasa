"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "framer-motion";
import { EASE_GLIDE, EASE_POP } from "@/lib/rasa/gsap-presets";
import { RasaImage } from "./RasaImage";
import { ph1, ph1In } from "@/lib/rasa/ui";

type Props = {
  title: string;
  lead?: string;
  children?: React.ReactNode;
  /** Shorter hero on phones (e.g. seat map needs vertical space). */
  tight?: boolean;
};

export function PageHero({ title, lead, children, tight }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    gsap.set("[data-ph-logo]", { autoAlpha: 0, scale: 0.9, y: 8 });
    gsap.set("[data-ph-anim]", { autoAlpha: 0, y: 14 });
  }, [reduced]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.to("[data-ph-logo]", {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.62,
        ease: EASE_POP,
      }).to(
        "[data-ph-anim]",
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.48,
          stagger: 0.05,
          ease: EASE_GLIDE,
        },
        "-=0.32",
      );
    }, root);
    return () => ctx.revert();
  }, [reduced, title]);

  return (
    <div ref={rootRef} className={`${ph1}${tight ? " max-lg:py-4 max-lg:[&_h1]:text-[1.35rem]" : ""}`}>
      <div className={ph1In}>
        <div data-ph-logo className={`mb-3.5 w-fit${tight ? " max-lg:hidden" : ""}`}>
          <RasaImage
            img="logo-white"
            alt="RASA, Roots to Rhythm"
            width={900}
            height={450}
            className="!h-11 !w-auto"
          />
        </div>
        <h1 data-ph-anim className="font-display font-semibold">
          {title}
        </h1>
        {lead ? <p data-ph-anim className={tight ? "max-lg:hidden" : undefined}>{lead}</p> : null}
        {children ? <div data-ph-anim>{children}</div> : null}
      </div>
    </div>
  );
}