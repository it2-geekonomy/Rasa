"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DAYS, EV, TYPES, dayOf } from "@/lib/rasa/catalog";
import type { DayId } from "@/lib/rasa/types";
import { wrapTight } from "@/lib/rasa/ui";
import { PageHero } from "./PageHero";
import { EventCard } from "./EventCard";
import { PlanSidebar } from "./PlanSidebar";
import { BookingSeatSheet } from "@/components/rasa/booking/BookingSeatSheet";
import { useBookingCart } from "@/contexts/booking-cart-context";
import { usePlan } from "@/contexts/plan-context";
import { PageBody } from "@/components/rasa/motion/PageBody";

type Props = { day: DayId; focusId?: string };

export function EventsProgram({ day: initialDay, focusId }: Props) {
  const { day, setDay, mobilePlanOpen, closeMobilePlan } = usePlan();
  const [type, setType] = useState("all");
  const planAsideRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const { lineForEvent } = useBookingCart();
  const [seatEventId, setSeatEventId] = useState<string | null>(null);

  useEffect(() => {
    setDay(initialDay);
  }, [initialDay, setDay]);

  useEffect(() => {
    if (focusId) {
      setType("all");
      const el = document.getElementById(`ev-${focusId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId]);

  useEffect(() => {
    if (mobilePlanOpen) {
      planAsideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [mobilePlanOpen]);

  const d = dayOf(day as DayId);
  let list = EV.filter(
    (e) =>
      e.d === day &&
      (type === "all" ||
        (type === "work" ? e.ty === "work" || e.ws : e.ty === type) ||
        (e.ty === "brk" && type === "perf") ||
        (e.id === "u3" && type === "perf")),
  );

  return (
    <>
      <PageHero
        title="RASA Festival January 2027"
        lead="Three days at PCPA. Tap a session for details. Tick to save your plan — auditorium shows open the seat map, then land in your ticket cart."
      />
      <PageBody className={wrapTight}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex w-full gap-2 max-md:w-full" role="group" aria-label="Day">
            {DAYS.map((x) => (
              <button
                key={x.id}
                type="button"
                className={
                  day === x.id
                    ? "flex min-h-[58px] flex-1 flex-col items-start rounded-xl border-2 border-plum bg-plum px-3 py-2 text-left max-md:min-h-0"
                    : "flex min-h-[58px] flex-1 flex-col items-start rounded-xl border-2 border-line bg-white px-3 py-2 text-left max-md:min-h-0"
                }
                aria-pressed={day === x.id}
                onClick={() => router.push(`/events/${x.id}`)}
              >
                <small
                  className={`font-lab text-[0.8rem] font-semibold uppercase tracking-widest ${
                    day === x.id ? "text-white" : "text-muted"
                  }`}
                >
                  {x.short}
                </small>
                <b className={`font-display text-lg ${day === x.id ? "text-white" : "text-plum"}`}>
                  {x.num}
                </b>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {TYPES.map((t) => (
            <button
              key={t[0]}
              type="button"
              className={
                type === t[0]
                  ? "min-h-11 rounded-full border-2 border-burg bg-burg px-4 py-2 font-bold text-white"
                  : "min-h-11 rounded-full border-2 border-line bg-white px-4 py-2 font-medium"
              }
              aria-pressed={type === t[0]}
              onClick={() => setType(t[0])}
            >
              {t[1]}
            </button>
          ))}
        </div>
        <VenueKey />
        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="mb-3 text-muted">
              <b>{d.long}.</b> {d.info}
            </p>
            {list.length ? (
              list.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  defaultOpen={focusId === e.id}
                  onPickSeats={(id) => setSeatEventId(id)}
                  ticketSeatCount={lineForEvent(e.id)?.seats.length ?? 0}
                />
              ))
            ) : (
              <p className="text-[0.9rem] text-muted">
                Nothing in this filter on {d.long}. Try another filter.
              </p>
            )}
          </div>
          <PlanSidebar
            ref={planAsideRef}
            mobileOpen={mobilePlanOpen}
            onMobileClose={closeMobilePlan}
            onEditTicketSeats={(id) => setSeatEventId(id)}
          />
        </div>
      </PageBody>
      <BookingSeatSheet eventId={seatEventId} onClose={() => setSeatEventId(null)} />
    </>
  );
}

function VenueKey() {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2 gap-y-2 text-[0.9rem] text-muted" role="group" aria-label="Venue colours">
      {[
        ["sw-amph", "#f4dce0", "Amphitheatre"],
        ["sw-aud", "#ece1ed", "Auditorium"],
        ["sw-art", "#fff", "Art shows"],
        ["sw-other", "#fff", "Rehearsal Studio and Banquet Hall"],
      ].map(([cls, bg, label]) => (
        <span key={label} className="inline-flex items-center gap-2">
          <i
            className="inline-block size-[18px] rounded-[5px] border border-[#cdb9cf]"
            style={{ background: bg }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}