"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  if (reduced) return children;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0.92, scale: 0.996 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}