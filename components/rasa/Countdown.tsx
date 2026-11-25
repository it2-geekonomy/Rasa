"use client";

import { useEffect, useState } from "react";
import { countdownDays } from "@/lib/rasa/time";

export function Countdown() {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => setDays(countdownDays()), []);
  if (days === null) return <div className="mt-5 h-8" aria-hidden />;
  const inner =
    days > 0 ? (
      <>
        <b className="font-display text-[2.2rem] text-white">{days}</b> days to go
      </>
    ) : days > -3 ? (
      <b>Happening now</b>
    ) : (
      <b>Thank you</b>
    );

  return (
    <div
      className="mt-5 inline-flex items-baseline gap-2.5 font-lab text-[0.95rem] font-semibold uppercase tracking-widest text-[#eadcee]"
      aria-live="polite"
    >
      {inner}
    </div>
  );
}