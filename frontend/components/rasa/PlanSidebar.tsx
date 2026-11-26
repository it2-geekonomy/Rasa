"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { DAYS, EV, byEventId } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { usePlan } from "@/contexts/plan-context";
import { useToast } from "@/contexts/toast-context";
import { useBookingCart, seatLabel } from "@/contexts/booking-cart-context";
import { formatInr } from "@/lib/rasa/booking-pricing";
import { btn, btnLine } from "@/lib/rasa/ui";

type Props = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onEditTicketSeats?: (eventId: string) => void;
};

function planText(planIds: string[]) {
  const events = planIds.map((id) => EV.find((e) => e.id === id)).filter(Boolean);
  if (!events.length) return "";
  return (
    "My RASA plan\n" +
    DAYS.map((d) => {
      const x = events.filter((e) => e!.d === d.id).sort((a, b) => a!.s - b!.s);
      if (!x.length) return "";
      return (
        d.long +
        "\n" +
        x
          .map((e) => {
            const time = e!.tl
              ? e!.tl + (e!.ts ? ` ${e!.ts}` : "")
              : `${fmtMinutes(e!.s)} to ${fmtMinutes(e!.e)}`;
            return `  ${time}  ${e!.t}${e!.w ? ` (${e!.w})` : ""}${e!.v ? `, ${e!.v}` : ""}`;
          })
          .join("\n")
      );
    })
      .filter(Boolean)
      .join("\n\n")
  );
}

function clashes(planIds: string[]) {
  const p = planIds.map((id) => EV.find((e) => e.id === id)).filter(Boolean);
  const out: [typeof p[0], typeof p[0]][] = [];
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      const a = p[i]!;
      const b = p[j]!;
      if (a.d === b.d && !a.nt && !b.nt && a.s < b.e && b.s < a.e) {
        out.push([a, b]);
      }
    }
  }
  return out;
}

export const PlanSidebar = forwardRef<HTMLElement, Props>(function PlanSidebar(
  { mobileOpen, onMobileClose, onEditTicketSeats },
  ref,
) {
  const { plan, clearPlan } = usePlan();
  const { lines, cartTotal, seatCount, removeLine, clearCart } = useBookingCart();
  const { toast } = useToast();
  const events = plan.map((id) => EV.find((e) => e.id === id)).filter(Boolean);
  const cl = clashes(plan);

  return (
    <aside
      ref={ref}
      className={`sticky top-[132px] rounded-2xl bg-tint p-5 max-md:static max-md:mt-5 ${
        mobileOpen ? "max-md:!block" : "max-md:hidden"
      }`}
      aria-label="Your plan and ticket cart"
    >
      {lines.length ? (
        <section className="mb-5 border-b border-line pb-5" aria-label="Ticket cart">
          <h3 className="mb-1 font-display text-xl font-semibold text-plum">Ticket cart</h3>
          <p className="m-0 text-[0.9rem] text-muted">
            {seatCount} seat{seatCount === 1 ? "" : "s"} · {formatInr(cartTotal)}
          </p>
          <ul className="my-3 grid list-none gap-2">
            {lines.map((line) => {
              const ev = byEventId(line.eventId);
              if (!ev) return null;
              const sub = line.seats.reduce((n, s) => n + s.price, 0);
              return (
                <li key={line.eventId} className="rounded-[10px] border border-plum/15 bg-white px-3 py-2.5 text-[0.92rem]">
                  <b className="font-lab tracking-wide text-plum">
                    {DAYS.find((d) => d.id === ev.d)?.short} {ev.tl || fmtMinutes(ev.s)}
                  </b>
                  <p className="mt-0.5 font-medium text-ink">{ev.t}</p>
                  <p className="mt-1 text-[0.85rem] text-muted">
                    {line.seats.length} seat{line.seats.length === 1 ? "" : "s"} · {formatInr(sub)}
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-1 text-[0.8rem] text-plum">
                    {line.seats.map((s) => (
                      <li key={s.id} className="rounded-full bg-tint px-2 py-0.5">
                        {seatLabel(s.id)}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="text-xs font-bold text-burg hover:underline"
                      onClick={() => onEditTicketSeats?.(line.eventId)}
                    >
                      Change seats
                    </button>
                    <button
                      type="button"
                      className="text-xs font-bold text-muted hover:text-burg hover:underline"
                      onClick={() => removeLine(line.eventId)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link href="/booking?view=cart" className={btn}>
              Review & pay
            </Link>
            <button type="button" className={btnLine} onClick={clearCart}>
              Clear cart
            </button>
          </div>
        </section>
      ) : null}

      <h3 className="mb-1 font-display text-xl font-semibold text-plum">Your plan</h3>
      <p className="m-0 text-[0.9rem] text-muted">
        {events.length
          ? `${events.length} session${events.length > 1 ? "s" : ""} saved on this device.`
          : lines.length
            ? "Tick other sessions to build a personal itinerary alongside your tickets."
            : "Tick any session to build your own plan."}
      </p>
      {events.length ? (
        <>
          <ul className="my-3 grid list-none gap-2">
            {events
              .sort(
                (a, b) =>
                  DAYS.findIndex((d) => d.id === a!.d) -
                    DAYS.findIndex((d) => d.id === b!.d) || a!.s - b!.s,
              )
              .map((e) => (
                <li key={e!.id} className="rounded-[10px] bg-white px-3 py-2 text-[0.95rem]">
                  <b className="font-lab tracking-wide text-plum">
                    {DAYS.find((d) => d.id === e!.d)?.short}{" "}
                    {e!.tl || fmtMinutes(e!.s)}
                  </b>{" "}
                  {e!.t}
                </li>
              ))}
          </ul>
          {cl.map(([a, b]) => (
            <div
              key={`${a!.id}-${b!.id}`}
              className="my-2 rounded-[10px] bg-[#fbe7ea] px-3 py-2 text-[0.92rem] font-medium text-burg-d"
            >
              Overlap on {DAYS.find((d) => d.id === a!.d)?.short}: {a!.t} and {b!.t} run at the same
              time.
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum"
              onClick={() => {
                const txt = planText(plan);
                void navigator.clipboard?.writeText(txt).then(
                  () => toast("Plan copied"),
                  () => toast("Copy is blocked in this browser"),
                );
              }}
            >
              Copy plan
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum"
              onClick={() => {
                clearPlan();
                onMobileClose?.();
              }}
            >
              Clear
            </button>
          </div>
        </>
      ) : null}
    </aside>
  );
});