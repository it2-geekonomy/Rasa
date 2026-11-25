"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_DAY = "rasa-day";
const STORAGE_PLAN = "rasa-plan";

type PlanContextValue = {
  day: string;
  setDay: (day: string) => void;
  plan: string[];
  togglePlan: (id: string) => void;
  clearPlan: () => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [day, setDayState] = useState("fri");
  const [plan, setPlan] = useState<string[]>([]);
  useEffect(() => {
    try {
      const d = localStorage.getItem(STORAGE_DAY);
      if (d) setDayState(d);
      const p = JSON.parse(localStorage.getItem(STORAGE_PLAN) || "[]") as string[];
      if (Array.isArray(p)) setPlan(p);
    } catch {
      /* ignore */
    }
  }, []);

  const setDay = useCallback((d: string) => {
    setDayState(d);
    try {
      localStorage.setItem(STORAGE_DAY, d);
    } catch {
      /* ignore */
    }
  }, []);

  const persistPlan = useCallback((next: string[]) => {
    setPlan(next);
    try {
      localStorage.setItem(STORAGE_PLAN, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const togglePlan = useCallback(
    (id: string) => {
      setPlan((prev) => {
        const i = prev.indexOf(id);
        const next = i >= 0 ? prev.filter((x) => x !== id) : [...prev, id];
        persistPlan(next);
        return next;
      });
    },
    [persistPlan],
  );

  const clearPlan = useCallback(() => persistPlan([]), [persistPlan]);

  const value = useMemo(
    () => ({ day, setDay, plan, togglePlan, clearPlan }),
    [day, setDay, plan, togglePlan, clearPlan],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}