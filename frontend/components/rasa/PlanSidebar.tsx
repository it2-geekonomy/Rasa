"use client";

import { forwardRef, useEffect, useState } from "react";
import { DAYS, EV } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { usePlan } from "@/contexts/plan-context";
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
  { mobileOpen, onMobileClose, onOpenCart, onEditShow },
  ref,
) {
  const { plan, clearPlan } = usePlan();
  const { lines, cartTotal, seatCount, earliestExpiryMs, removeLine, clearCart } = useBookingCart();
  const { toast } = useToast();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!earliestExpiryMs) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [earliestExpiryMs]);

  const events = plan.map((id) => EV.find((e) => e.id === id)).filter(Boolean);
  const cl = clashes(plan);
  const remainingMs = earliestExpiryMs ? Math.max(0, earliestExpiryMs - now) : null;

  return (
    <aside
      ref={ref}
      className={`sticky top-[152px] space-y-5 rounded-2xl bg-tint p-5 lg:max-h-[calc(100dvh-168px)] lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:static max-md:mt-5 ${
        mobileOpen ? "max-md:!block" : "max-md:hidden"
      }`}
      aria-label="Your plan and ticket cart"
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
            No seats in cart yet. Tap &ldquo;Pick seats on map&rdquo; on any auditorium show to reserve seats.
          </p>
        )}
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="mb-1 font-display text-xl font-semibold text-plum">Your plan</h3>
      <p className="m-0 text-[0.9rem] text-muted">
        {events.length
          ? `${events.length} session${events.length > 1 ? "s" : ""} saved on this device.`
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
      </div>
    </aside>
  );
});