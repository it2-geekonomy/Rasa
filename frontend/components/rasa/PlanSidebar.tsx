"use client";

import { forwardRef, useEffect, useState } from "react";
import { DAYS, EV } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { useBookingCart } from "@/contexts/booking-cart-context";
import { formatInr } from "@/lib/rasa/booking-pricing";
import { useToast } from "@/contexts/toast-context";

type Props = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onOpenCart?: () => void;
  onEditShow?: (eventId: string) => void;
};

function formatCountdown(msRemaining: number) {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const PlanSidebar = forwardRef<HTMLElement, Props>(function PlanSidebar(
  { mobileOpen, onOpenCart, onEditShow },
  ref,
) {
  const { lines, cartTotal, seatCount, earliestExpiryMs, removeLine, clearCart } = useBookingCart();
  const { toast } = useToast();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!earliestExpiryMs) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [earliestExpiryMs]);

  const remainingMs = earliestExpiryMs ? Math.max(0, earliestExpiryMs - now) : null;

  return (
    <aside
      ref={ref}
      className={`sticky top-[152px] rounded-2xl bg-tint p-5 lg:max-h-[calc(100dvh-168px)] lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:static max-md:mt-5 ${
        mobileOpen ? "max-md:!block" : "max-md:hidden"
      }`}
      aria-label="Your tickets"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-semibold text-plum">Your tickets</h3>
          {remainingMs !== null ? (
            <span
              className={`rounded-full px-2.5 py-0.5 font-lab text-xs font-bold tabular-nums ${
                remainingMs < 120_000
                  ? "bg-burg/15 text-burg"
                  : "bg-amber-100 text-amber-900"
              }`}
              title="Seats are held until this timer runs out"
            >
              Held · {formatCountdown(remainingMs)}
            </span>
          ) : null}
        </div>
        {lines.length ? (
          <>
            <p className="mt-1 text-[0.88rem] text-muted">
              {seatCount} seat{seatCount === 1 ? "" : "s"} reserved across {lines.length} show
              {lines.length === 1 ? "" : "s"}. Complete payment before the hold expires.
            </p>
            <ul className="my-3 grid list-none gap-2">
              {lines.map((line) => {
                const ev = EV.find((e) => e.id === line.eventId);
                if (!ev) return null;
                const sub = line.seats.reduce((s, x) => s + x.price, 0);
                return (
                  <li key={line.eventId} className="rounded-xl border border-line bg-white p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-lab text-[0.7rem] font-bold uppercase tracking-wider text-burg">
                          {DAYS.find((d) => d.id === ev.d)?.short} · {fmtMinutes(ev.s)}
                        </p>
                        <p className="font-semibold leading-snug text-plum">{ev.t}</p>
                        <p className="mt-1 text-xs text-muted">
                          Seats: {line.seats.map((s) => `${s.row}-${s.col}`).join(", ")}
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-base font-bold tabular-nums text-burg">
                        {formatInr(sub)}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-3 border-t border-line/70 pt-2 text-xs">
                      {onEditShow ? (
                        <button
                          type="button"
                          className="font-bold text-plum hover:underline"
                          onClick={() => onEditShow(line.eventId)}
                        >
                          Edit seats
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="font-bold text-burg hover:underline"
                        onClick={() => {
                          removeLine(line.eventId);
                          toast(`Released seats for ${ev.t}`);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              {onOpenCart ? (
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-full bg-burg px-4 py-2 text-sm font-bold text-white shadow hover:bg-burg-d"
                  onClick={onOpenCart}
                >
                  Pay {formatInr(cartTotal)}
                </button>
              ) : null}
              <button
                type="button"
                className="min-h-11 rounded-full border-2 border-plum bg-white px-4 py-2 text-sm font-bold text-plum"
                onClick={() => {
                  clearCart(true);
                  toast("Released all held seats");
                }}
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <p className="mt-1 text-[0.88rem] text-muted">
            No seats in cart yet. Tap &ldquo;Get tickets&rdquo; on any auditorium show to reserve seats.
          </p>
        )}
      </div>
    </aside>
  );
});