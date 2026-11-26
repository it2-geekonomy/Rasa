"use client";

import type { ReactNode } from "react";
import { ScrollSection } from "./ScrollSection";

/** One clean scroll-in for page content below the hero (GSAP ScrollTrigger). */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <ScrollSection className={className}>{children}</ScrollSection>;
}