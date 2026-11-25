"use client";

import { useState, type ReactNode } from "react";
import { PlanProvider } from "@/contexts/plan-context";
import { ToastProvider } from "@/contexts/toast-context";
import { BottomNav } from "./BottomNav";
import { MoreSheet } from "./MoreSheet";

export function Providers({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState(false);

  return (
    <ToastProvider>
      <PlanProvider>
        {children}
        <BottomNav onMore={() => setSheet(true)} moreOpen={sheet} />
        <MoreSheet open={sheet} onClose={() => setSheet(false)} />
      </PlanProvider>
    </ToastProvider>
  );
}