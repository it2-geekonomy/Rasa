/** Shared motion tokens — crisp, short, festival-appropriate. */

export const easeOut = [0.22, 1, 0.36, 1] as const;

export const duration = {
  fast: 0.26,
  base: 0.4,
  slow: 0.52,
} as const;

export const motionY = 12;

export const fadeUp = {
  hidden: { opacity: 0, y: motionY },
  visible: { opacity: 1, y: 0 },
} as const;

export const pageVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easeOut },
  },
} as const;

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.055, delayChildren: 0.03 },
  },
} as const;

export const staggerItem = {
  hidden: { opacity: 0, y: motionY },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easeOut },
  },
} as const;

export const sheetBackdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.fast } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
} as const;

export const sheetPanel = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { type: "spring" as const, damping: 32, stiffness: 340 } },
  exit: { y: "100%", transition: { duration: duration.base, ease: easeOut } },
} as const;