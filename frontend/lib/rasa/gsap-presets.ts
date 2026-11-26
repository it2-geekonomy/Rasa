/** GSAP-only presets — same UI; sharper perceived motion. */

export const EASE_POP = "back.out(1.28)";
export const EASE_SNAP = "power4.out";
export const EASE_GLIDE = "power3.out";

export const scrollReveal = {
  from: { opacity: 0, y: 20 },
  to: {
    opacity: 1,
    y: 0,
    duration: 0.62,
    ease: EASE_SNAP,
  },
  stagger: 0.055,
  start: "top 84%",
} as const;