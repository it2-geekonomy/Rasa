"use client";

import { dayOf } from "@/lib/rasa/catalog";
import { AUDITORIUM_TICKET_EVENTS } from "@/lib/rasa/booking-events";
import { fmtMinutes } from "@/lib/rasa/time";
import { card, lab } from "@/lib/rasa/ui";
import { RasaImage } from "@/components/rasa/RasaImage";
import { useBookingCart } from "@/contexts/booking-cart-context";

type Props = {
  onSelect: (eventId: string) => void;
};

export function BookingEventPicker({ onSelect }: Props) {
  const { lineForEvent } = useBookingCart();

  return (
    <div className="grid gap-[18px] sm:grid-cols-2">
      {AUDITORIUM_TICKET_EVENTS.map((e) => {
        const d = dayOf(e.d);
        const inCart = lineForEvent(e.id);
        const poster = e.img?.[0];
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onSelect(e.id)}
            className={`${card} group flex h-full flex-col gap-3 border-2 border-transparent p-0 text-left shadow-sm transition hover:border-plum/30 hover:shadow-md focus-visible:border-plum focus-visible:outline-none`}
          >
            {poster ? (
              <RasaImage
                img={poster}
                alt={e.imgalt?.[0] || e.t}
                className="!aspect-[16/9] !rounded-b-none !rounded-t-rasa"
                width={640}
                height={360}
              />
            ) : (
              <div className="grid aspect-[16/9] place-items-center rounded-t-rasa bg-tint2 px-4 text-center text-sm text-muted">
                Auditorium performance
              </div>
            )}
            <div className="flex flex-1 flex-col gap-2 px-[22px] pb-[22px]">
              <span className={`${lab} text-burg`}>
                {d.long} · {fmtMinutes(e.s)}
                {e.e > e.s ? ` – ${fmtMinutes(e.e)}` : ""}
              </span>
              <h3 className="!mb-0 font-display text-[1.15rem]">{e.t}</h3>
              {e.w ? <p className="!text-[0.95rem]">{e.w}</p> : null}
              {inCart ? (
                <span className="mt-auto inline-flex w-fit rounded-full bg-tint px-3 py-1 text-xs font-bold text-plum">
                  {inCart.seats.length} seat{inCart.seats.length === 1 ? "" : "s"} in cart
                </span>
              ) : (
                <span className="mt-auto font-bold text-burg group-hover:underline">
                  Select seats →
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}