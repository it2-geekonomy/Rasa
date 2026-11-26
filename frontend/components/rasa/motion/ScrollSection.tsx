"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { EASE_SNAP } from "@/lib/rasa/gsap-presets";

type Props = {
  children: ReactNode;
  className?: string;
};

export function ScrollSection({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    gsap.set(el, { autoAlpha: 0, y: 24 });

    const tween = gsap.to(el, {
      autoAlpha: 1,
      y: 0,
      duration: 0.58,
      ease: EASE_SNAP,
      clearProps: "transform",
      scrollTrigger: {
        trigger: el,
        start: "top 86%",
        once: true,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
      tween.kill();
    };
  }, [reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}