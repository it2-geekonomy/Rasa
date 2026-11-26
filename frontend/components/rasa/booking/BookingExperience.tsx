"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { byEventId, dayOf } from "@/lib/rasa/catalog";
import { bookingPathForEvent, isAuditoriumTicketEvent } from "@/lib/rasa/booking-events";
import { fmtMinutes } from "@/lib/rasa/time";
import { btn, btnLine, lab, wrapTight } from "@/lib/rasa/ui";
import { seatIdsFromLine, useBookingCart } from "@/contexts/booking-cart-context";
import { BookingStepper } from "./BookingStepper";
import { BookingEventPicker } from "./BookingEventPicker";
import { AuditoriumSeatMap } from "./AuditoriumSeatMap";
import { BookingCartReview } from "./BookingCartReview";
import { formatInr, TIER_PRICE_INR, tierForAllocation } from "@/lib/rasa/booking-pricing";
import { AUDITORIUM_SEATS, parseSeatId } from "@/lib/rasa/auditorium-seats";

type Step = "event" | "seats" | "cart";

export function BookingExperience() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("event");
  const [eventId, setEventId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const { setEventSeats, lineForEvent, lines, cartTotal, seatCount } = useBookingCart();

  const goToEventList = useCallback(() => {
    setEventId(null);
    setStep("event");
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const active = eventId ? byEventId(eventId) : undefined;

  const lockedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const line of lines) {
      if (line.eventId === eventId) continue;
      for (const s of line.seats) ids.add(s.id);
    }
    return ids;
  }, [lines, eventId]);

  const openEvent = useCallback(
    (id: string) => {
      const ev = byEventId(id);
      if (!ev || !isAuditoriumTicketEvent(ev)) return;
      setEventId(id);
      const existing = lineForEvent(id);
      setDraft(new Set(seatIdsFromLine(existing)));
      setStep("seats");
      router.replace(bookingPathForEvent(id), { scroll: false });
    },
    [lineForEvent, router],
  );

  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "cart") {
      setStep("cart");
      return;
    }
    const id = searchParams.get("event");
    if (!id) return;
    if (eventId === id && step === "seats") return;
    const ev = byEventId(id);
    if (!ev || !isAuditoriumTicketEvent(ev)) return;
    setEventId(id);
    setDraft(new Set(seatIdsFromLine(lineForEvent(id))));
    setStep("seats");
  }, [searchParams, lineForEvent, eventId, step]);

  const toggleSeat = useCallback((id: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  const saveSeatsAndContinue = useCallback(() => {
    if (!eventId) return;
    setEventSeats(eventId, [...draft]);
    setStep("cart");
    router.replace(`${pathname}?view=cart`, { scroll: false });
  }, [draft, eventId, setEventSeats, router, pathname]);

  return (
    <div className={wrapTight}>
      <header
        className={`mb-2 flex flex-wrap items-end justify-between gap-4 ${step === "seats" ? "max-lg:hidden" : ""}`}
      >
        <BookingIntro step={step} seatCount={seatCount} cartTotal={cartTotal} />
      </header>

      <div className={step === "seats" ? "max-lg:hidden" : undefined}>
        <BookingStepper step={step} />
      </div>

      {step === "event" ? <BookingEventPicker onSelect={openEvent} /> : null}

      {step === "seats" && active ? (
        <section aria-label="Seat selection" className="max-lg:-mt-1">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2 rounded-rasa border border-line bg-white p-3 shadow-sm max-lg:mb-2 max-lg:rounded-lg max-lg:p-2.5 lg:mb-6 lg:p-5">
            <div className="min-w-0 flex-1">
              <p className={`${lab} text-[0.7rem] text-burg lg:text-[0.85rem]`}>
                {dayOf(active.d).long} · {fmtMinutes(active.s)}
              </p>
              <h2 className="font-display text-base leading-snug text-plum lg:text-[clamp(1.35rem,3vw,1.75rem)]">
                {active.t}
              </h2>
              <p className="mt-1 hidden text-sm text-muted lg:block">
                Auditorium seating — select one or more seats, then continue.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs font-bold text-burg hover:underline lg:mt-3 lg:text-sm"
              onClick={goToEventList}
            >
              ← Change show
            </button>
          </div>

          <AuditoriumSeatMap selected={draft} onToggle={toggleSeat} lockedIds={lockedIds} />

          <div className="sticky bottom-[calc(84px+0.75rem)] z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-rasa border border-plum/15 bg-white/95 p-4 shadow-lg backdrop-blur-md md:bottom-4">
            <DraftFooterSummary draft={draft.size} total={draftTotal} />
            <SeatStepActions onBack={goToEventList} onContinue={saveSeatsAndContinue} disabled={!draft.size} />
          </div>
        </section>
      ) : null}

      {step === "cart" ? (
        <BookingCartReview onAddAnother={goToEventList} onEditSeats={(id) => openEvent(id)} />
      ) : null}
    </div>
  );
}

function BookingIntro({
  step,
  seatCount,
  cartTotal,
}: {
  step: Step;
  seatCount: number;
  cartTotal: number;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-plum">Book auditorium tickets</h2>
      <p className="mt-1 max-w-[58ch] text-muted">
        {step === "event"
          ? "Start with a show, then choose seats on the official layout. Add more events anytime — your cart total updates when every show has seats."
          : "Interactive seating for the Prestige auditorium. Pricing is indicative for the demo."}
      </p>
      {seatCount > 0 ? (
        <p className="mt-2 text-sm font-semibold text-plum">
          Cart: {seatCount} seat{seatCount === 1 ? "" : "s"} · {formatInr(cartTotal)}
        </p>
      ) : null}
    </div>
  );
}

function DraftFooterSummary({ draft, total }: { draft: number; total: number }) {
  return (
    <p className="font-display text-lg text-plum">
      {draft ? (
        <>
          {draft} seat{draft === 1 ? "" : "s"} · <span className="text-burg">{formatInr(total)}</span>
        </>
      ) : (
        "Select at least one seat"
      )}
    </p>
  );
}

function SeatStepActions({
  onBack,
  onContinue,
  disabled,
}: {
  onBack: () => void;
  onContinue: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btnLine} onClick={onBack}>
        Back
      </button>
      <button type="button" className={btn} disabled={disabled} onClick={onContinue}>
        Add to cart & review
      </button>
    </div>
  );
}
