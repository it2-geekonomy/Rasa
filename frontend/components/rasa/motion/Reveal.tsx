"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { duration, easeOut, fadeUp } from "@/lib/rasa/motion";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: Props) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-48px 0px -48px 0px", amount: 0.12 }}
      variants={{
        hidden: fadeUp.hidden,
        visible: {
          ...fadeUp.visible,
          transition: { duration: duration.base, ease: easeOut, delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}