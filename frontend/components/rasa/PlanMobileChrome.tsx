"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { usePlan } from "@/contexts/plan-context";
import { useBookingCart } from "@/contexts/booking-cart-context";
import { PlanSidebar } from "./PlanSidebar";
import { sheetBackdrop, sheetPanel } from "@/lib/rasa/motion";

/** Handover `#planfab` — fixed on mobile, plan count updates as sessions are ticked. */
export function PlanMobileChrome() {
  const pathname = usePathname();
  const { plan, mobilePlanOpen, toggleMobilePlan, closeMobilePlan } = usePlan();
  const { seatCount } = useBookingCart();
  const badge = plan.length;
  const onEvents = pathname.startsWith("/events");

  useEffect(() => {
    closeMobilePlan();
  }, [pathname, closeMobilePlan]);

  return (
    <>
      {!(onEvents && seatCount > 0) ? (
        <button
          type="button"
          className="planfab fixed bottom-[calc(68px+env(safe-area-inset-bottom))] right-3 z-[25] hidden max-md:flex min-h-9 items-center gap-1.5 rounded-full bg-burg px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(63,20,65,.32)]"
          onClick={toggleMobilePlan}
        >
          Your plan <b>{badge}</b>
        </button>
      ) : null}
      <AnimatePresence>
        {!onEvents && mobilePlanOpen ? (
          <motion.div
            key="plan-sheet"
            className="fixed inset-0 z-50 flex items-end bg-[rgba(36,20,38,.55)] md:hidden"
            role="dialog"
            aria-label="Your plan"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sheetBackdrop}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeMobilePlan();
            }}
          >
            <motion.div
              className="max-h-[70vh] w-full overflow-y-auto rounded-t-[20px] bg-tint px-[18px] pb-[calc(96px+env(safe-area-inset-bottom))] pt-[18px]"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sheetPanel}
            >
              <PlanSidebar mobileOpen onMobileClose={closeMobilePlan} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}