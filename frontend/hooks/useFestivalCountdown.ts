"use client";

import { useCallback, useEffect, useState } from "react";
import {
  festivalCountdown,
  msUntilNextLocalMidnight,
  type FestivalPhase,
} from "@/lib/rasa/time";

export type FestivalCountdown = {
  days: number;
  phase: FestivalPhase;
};

/**
 * Days until 8 Jan 2027 (local date). Recomputes at each local midnight and when the tab becomes visible again.
 */
export function useFestivalCountdown(): FestivalCountdown | null {
  const [value, setValue] = useState<FestivalCountdown | null>(null);

  const refresh = useCallback(() => {
    setValue(festivalCountdown());
  }, []);

  useEffect(() => {
    refresh();

    let midnightTimer: number | undefined;
    let dailyInterval: number | undefined;

    const scheduleMidnightRefresh = () => {
      const delay = msUntilNextLocalMidnight();
      midnightTimer = window.setTimeout(() => {
        refresh();
        dailyInterval = window.setInterval(refresh, 86_400_000);
      }, delay);
    };

    scheduleMidnightRefresh();

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
      if (dailyInterval !== undefined) window.clearInterval(dailyInterval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return value;
}