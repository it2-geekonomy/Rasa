"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { byEventId, dayOf } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { btn, btnLine, lab } from "@/lib/rasa/ui";
import { sheetBackdrop, sheetPanel, duration, easeOut } from "@/lib/rasa/motion";
import { seatIdsFromLine, useBookingCart } from "@/contexts/booking-cart-context";
import { formatInr, TIER_PRICE_INR, tierForAllocation } from "@/lib/rasa/booking-pricing";
import { AUDITORIUM_SEATS, parseSeatId } from "@/lib/rasa/auditorium-seats";
import { useToast } from "@/contexts/toast-context";
import { AuditoriumSeatMap } from "./AuditoriumSeatMap";

type Props = {
  eventId: string | null;
  onClose: () => void;
};

export function BookingSeatSheet({ eventId, onClose }: Props) {
  const reduced = useReducedMotion();
  const { setEventSeats, lineForEvent, lines } = useBookingCart();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Set<string>>(new Set());

  const ev = eventId ? byEventId(eventId) : undefined;
  const open = Boolean(eventId && ev);

  useEffect(() => {
    if (!eventId) return;
    setDraft(new Set(seatIdsFromLine(lineForEvent(eventId))));
  }, [eventId, lineForEvent]);

  const lockedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const line of lines) {
      if (line.eventId === eventId) continue;
      for (const s of line.seats) ids.add(s.id);
    }
    return ids;
  }, [lines, eventId]);

  const draftTotal = useMemo(() => {
    let n = 0;
    draft.forEach((id) => {
      const { row, col } = parseSeatId(id);
      const seat = AUDITORIUM_SEATS.find((s) => s.row === row && s.col === col);
      if (!seat) return;
      const tier = tierForAllocation(seat.allocation);
      if (tier) n += TIER_PRICE_INR[tier];
    });
    return n;
  }, [draft]);

  const toggleSeat = useCallback((id: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const save = useCallback(() => {
    if (!eventId || !draft.size) return;
    setEventSeats(eventId, [...draft]);
    const evNow = byEventId(eventId);
    toast(evNow ? `Added to cart: ${evNow.t}` : "Added to cart");
    onClose();
  }, [draft, eventId, onClose, setEventSeats, toast]);

  return (
    <AnimatePresence>
      {open && ev ? (
        <motion.div
          key={eventId}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(36,20,38,.55)] sm:items-center sm:p-4"
          role="dialog"
          aria-labelledby="seat-sheet-title"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={sheetBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="flex h-[min(100dvh,900px)] max-h-[100dvh] w-full max-w-[min(100vw,72rem)] min-w-0 flex-col overflow-hidden rounded-t-[20px] bg-white sm:h-auto sm:max-h-[min(92vh,900px)] sm:max-w-[min(96vw,72rem)] sm:rounded-rasa"
            onClick={(e) => e.stopPropagation()}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={reduced ? undefined : sheetPanel}
            transition={{ duration: duration.base, ease: easeOut }}
          >
            <div className="shrink-0 border-b border-line px-3 py-2.5 sm:px-5 sm:py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pr-2">
                  <p className={`${lab} text-[0.65rem] text-burg sm:text-[0.85rem]`}>
                    {dayOf(ev.d).long} · {fmtMinutes(ev.s)}
                  </p>
                  <h2 id="seat-sheet-title" className="font-display text-[0.95rem] leading-snug text-plum sm:text-xl">
                    {ev.t}
                  </h2>
                  <p className="mt-0.5 hidden text-sm text-muted sm:block">Pick seats on the map below.</p>
                </div>
                <button
                  type="button"
                  className="min-h-11 rounded-full px-3 font-bold text-plum hover:bg-tint"
                  onClick={onClose}
                  aria-label="Close seat picker"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:overflow-y-auto sm:px-5 sm:py-4">
              <AuditoriumSeatMap
                variant="sheet"
                selected={draft}
                onToggle={toggleSeat}
                lockedIds={lockedIds}
              />
            </div>

            <div className="shrink-0 border-t border-line bg-white/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(36,20,38,.08)] backdrop-blur-sm sm:bg-tint/80 sm:px-5 sm:py-4 sm:pb-4 sm:shadow-none">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="font-display text-sm text-plum sm:text-lg">
                  {draft.size ? (
                    <>
                      {draft.size} seat{draft.size === 1 ? "" : "s"} ·{" "}
                      <span className="text-burg">{formatInr(draftTotal)}</span>
                    </>
                  ) : (
                    "Tap seats — drag the map to scroll"
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button type="button" className={`${btnLine} w-full min-h-11 text-sm sm:w-auto`} onClick={onClose}>
                    Cancel
                  </button>
                  <button type="button" className={`${btn} w-full min-h-11 text-sm sm:w-auto`} disabled={!draft.size} onClick={save}>
                    Add to cart
                  </button>
                </div>
              </div>
              <Link
                href={`/booking?event=${encodeURIComponent(ev.id)}`}
                className="mt-2 hidden text-sm font-bold text-burg hover:underline sm:inline-block"
              >
                Open full tickets page
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}