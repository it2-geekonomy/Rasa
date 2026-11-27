"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { scrollReveal } from "@/lib/rasa/gsap-presets";

type Props = { children: ReactNode; className?: string };

export function ScrollStagger({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduced) return;

    const items = root.querySelectorAll("[data-scroll-item]");
    if (!items.length) return;

    gsap.set(items, scrollReveal.from);

    const tween = gsap.to(items, {
      ...scrollReveal.to,
      stagger: scrollReveal.stagger,
      clearProps: "transform",
      scrollTrigger: {
        trigger: root,
        start: scrollReveal.start,
        once: true,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === root) st.kill();
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