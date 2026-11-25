"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePlan } from "@/contexts/plan-context";
import { PlanSidebar } from "./PlanSidebar";

/** Handover `#planfab` — fixed on mobile, plan count updates as sessions are ticked. */
export function PlanMobileChrome() {
  const pathname = usePathname();
  const { plan, mobilePlanOpen, toggleMobilePlan, closeMobilePlan } = usePlan();
  const onEvents = pathname.startsWith("/events");

  useEffect(() => {
    closeMobilePlan();
  }, [pathname, closeMobilePlan]);

  return (
    <>
      <button
        type="button"
        className="planfab fixed bottom-[calc(78px+env(safe-area-inset-bottom))] right-3.5 z-[25] hidden max-md:flex min-h-12 items-center gap-2 rounded-full bg-burg px-5 py-3 font-bold text-white shadow-[0_6px_18px_rgba(63,20,65,.35)]"
        onClick={toggleMobilePlan}
      >
        Your plan <b>{plan.length}</b>
      </button>
      {!onEvents && mobilePlanOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[rgba(36,20,38,.55)] md:hidden"
          role="dialog"
          aria-label="Your plan"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMobilePlan();
          }}
        >
          <div className="max-h-[70vh] w-full overflow-y-auto rounded-t-[20px] bg-tint px-[18px] pb-[calc(96px+env(safe-area-inset-bottom))] pt-[18px]">
            <PlanSidebar mobileOpen onMobileClose={closeMobilePlan} />
          </div>
        </div>
      ) : null}
    </>
  );
}