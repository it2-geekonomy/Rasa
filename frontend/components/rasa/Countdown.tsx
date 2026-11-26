"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "framer-motion";
import { useFestivalCountdown } from "@/hooks/useFestivalCountdown";

export function Countdown() {
  const countdown = useFestivalCountdown();
  const reduced = useReducedMotion();
  const daysRef = useRef<HTMLSpanElement>(null);
  const lastAnimated = useRef<number | null>(null);

  useEffect(() => {
    if (!countdown || countdown.phase !== "before") return;
    const el = daysRef.current;
    if (!el) return;

    if (reduced) {
      el.textContent = String(countdown.days);
      return;
    }

    if (lastAnimated.current === countdown.days) return;
    lastAnimated.current = countdown.days;

    const target = countdown.days;
    const counter = { val: 0 };
    gsap.to(counter, {
      val: target,
      duration: Math.min(1.2, 0.55 + target * 0.008),
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = String(Math.round(counter.val));
      },
    });
  }, [countdown, reduced]);

  if (countdown === null) {
    return <div className="mt-5 h-8" aria-hidden />;
  }

  const { days, phase } = countdown;

  const inner =
    phase === "before" ? (
      <>
        <b ref={daysRef} className="font-display text-[2.2rem] text-white tabular-nums max-md:text-[1.35rem]">
          {reduced ? days : "\u00a0"}
        </b>{" "}
        days to go
      </>
    ) : phase === "during" ? (
      <b>Happening now</b>
    ) : (
      <b>Thank you</b>
    );

  return (
    <div
      className="mt-4 inline-flex items-baseline gap-2 font-lab text-[0.85rem] font-semibold uppercase tracking-widest text-[#eadcee] max-md:text-[0.78rem] max-md:tracking-[0.14em]"
      aria-live="polite"
    >
      {inner}
    </div>
  );
}