"use client";

import { MotionConfig } from "framer-motion";
import { useState, type ReactNode } from "react";
import { BookingCartProvider } from "@/contexts/booking-cart-context";
import { PlanProvider } from "@/contexts/plan-context";
import { ToastProvider } from "@/contexts/toast-context";
import { BottomNav } from "./BottomNav";
import { MoreSheet } from "./MoreSheet";
import { PlanMobileChrome } from "./PlanMobileChrome";
import { RasaDocumentTitle } from "./RasaDocumentTitle";
import { GsapRoot } from "./motion/GsapRoot";

export function Providers({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
    <GsapRoot>
    <ToastProvider>
      <PlanProvider>
        <BookingCartProvider>
          <RasaDocumentTitle />
          {children}
          <PlanMobileChrome />
          <BottomNav onMore={() => setSheet(true)} moreOpen={sheet} />
          <MoreSheet open={sheet} onClose={() => setSheet(false)} />
        </BookingCartProvider>
      </PlanProvider>
    </ToastProvider>
    </GsapRoot>
    </MotionConfig>
  );
}