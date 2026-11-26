"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, type ReactNode } from "react";

let registered = false;

export function GsapRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }
  }, []);
  return children;
}