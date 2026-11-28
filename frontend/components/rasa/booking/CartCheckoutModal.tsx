"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { byEventId, dayOf } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { btn, btnLine, lab } from "@/lib/rasa/ui";
import { sheetBackdrop, sheetPanel, duration, easeOut } from "@/lib/rasa/motion";
import { seatLabel, useBookingCart } from "@/contexts/booking-cart-context";
import { formatInr } from "@/lib/rasa/booking-pricing";
import {
  cancelPendingBookings,
  holdAndCreateCartBookings,
  loadCartPasses,
  payBookingsSequentially,
  type SingleBookingResult,
} from "@/lib/rasa/cart-checkout";
import { TicketPasses, type PassBooking } from "./TicketPasses";

type Props = {
  open: boolean;
  onClose: () => void;
  onEditShow?: (eventId: string) => void;
};

export function CartCheckoutModal({ open, onClose, onEditShow }: Props) {
  const reduced = useReducedMotion();
  const { lines, cartTotal, seatCount, removeLine, clearCart } = useBookingCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SingleBookingResult[] | null>(null);
  const [passes, setPasses] = useState<PassBooking[] | null>(null);

  // If the cart changes (e.g. an item is removed or edited) before payment succeeds,
  // cancel the abandoned unpaid order and discard it so the next checkout uses the current cart.
  useEffect(() => {
    if (!passes?.length && result?.length) {
      void cancelPendingBookings(result);
      setResult(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  function handleClose() {
    if (!passes?.length && result?.length) {
      void cancelPendingBookings(result);
    }
    setError(null);
    setResult(null);
    if (passes?.length) {
      setPasses(null);
    }
    onClose();
  }

  async function handleCheckout(event: FormEvent) {
    event.preventDefault();
    const items = lines
      .map((line) => ({
        eventSessionId: line.sessionId ?? "",
        eventSeatIds: line.seats.map((s) => s.eventSeatId ?? "").filter(Boolean),
        holdToken: line.holdToken,
        holdExpiresAt: line.holdExpiresAt,
      }))
      .filter((i) => i.eventSessionId && i.eventSeatIds.length > 0);

    if (!items.length) {
      setError("Please select seats for at least one show.");
      return;
    }

    setBusy(true);
    setError(null);
    let created: SingleBookingResult[] | null = null;
    try {
      created = await holdAndCreateCartBookings({
        items,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
      });
      setResult(created);

      await payBookingsSequentially(created);
      const loaded = await loadCartPasses(created.map((c) => c.booking));
      setPasses(loaded);
      clearCart(false);
    } catch (caught) {
      if (created?.length) {
        await cancelPendingBookings(created);
        setResult(null);
      }
      setError(caught instanceof Error ? caught.message : "Could not complete the cart booking");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[65] flex bg-white"
          role="dialog"
          aria-modal="true"
          aria-label="Cart checkout"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={sheetBackdrop}
        >
          <motion.div
            className="flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-white"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={reduced ? undefined : sheetPanel}
            transition={{ duration: duration.base, ease: easeOut }}
          >
            <div className="shrink-0 border-b border-line bg-white px-4 py-3 sm:px-6 sm:py-4">
              <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
                <div>
                  <p className={`${lab} text-xs text-burg`}>Festival ticket cart</p>
                  <h2 className="font-display text-lg font-semibold text-plum sm:text-xl">
                    {passes?.length
                      ? "Your tickets are ready"
                      : `Checkout (${seatCount} seat${seatCount === 1 ? "" : "s"} across ${lines.length} show${lines.length === 1 ? "" : "s"})`}
                  </h2>
                </div>
                <button
                  type="button"
                  className="min-h-11 rounded-full px-3 font-bold text-plum hover:bg-tint"
                  onClick={handleClose}
                  aria-label="Close cart checkout"
                >
                  ✕
                </button>
              </div>
              {error ? (
                <p className="mt-2 rounded-lg border border-burg/25 bg-burg/5 px-3 py-2 text-sm font-medium text-burg">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              {passes?.length ? (
                <TicketPasses passes={passes} onBookAnother={handleClose} />
              ) : result && !passes ? (
                <div className="mx-auto my-auto w-full max-w-md rounded-rasa border border-line bg-tint/40 p-6 text-center">
                  <p className={`${lab} text-xs text-burg`}>
                    {result.map((r) => r.booking.bookingReference).join(" · ")}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-semibold text-plum">
                    {result.some((r) => r.checkout)
                      ? "Complete payment to generate tickets"
                      : "Generating your QR tickets…"}
                  </h3>
                  {result.some((r) => r.checkout) ? (
                    <button
                      type="button"
                      className={`${btn} mt-5`}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError(null);
                        try {
                          await payBookingsSequentially(result);
                          const loaded = await loadCartPasses(result.map((c) => c.booking));
                          setPasses(loaded);
                          clearCart(false);
                        } catch (caught) {
                          setError(
                            caught instanceof Error ? caught.message : "Payment could not be confirmed",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {busy ? "Processing…" : "Retry payment"}
                    </button>
                  ) : null}
                </div>
              ) : lines.length === 0 ? (
                <div className="mx-auto max-w-md py-12 text-center">
                  <p className="font-display text-xl text-plum">Your cart is empty</p>
                  <p className="mt-2 text-sm text-muted">
                    Pick seats from any auditorium show on the programme to add them here.
                  </p>
                  <button type="button" className={`${btn} mt-5`} onClick={handleClose}>
                    Browse shows
                  </button>
                </div>
              ) : (
                <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start">
                  <div className="space-y-4">
                    {lines.map((line) => {
                      const ev = byEventId(line.eventId);
                      if (!ev) return null;
                      const d = dayOf(ev.d);
                      const subtotal = line.seats.reduce((s, x) => s + x.price, 0);
                      return (
                        <article key={line.eventId} className="rounded-rasa border border-line bg-tint/40 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-lab text-xs font-semibold uppercase tracking-wider text-burg">
                                {d.long} · {fmtMinutes(ev.s)}
                              </p>
                              <h3 className="font-display text-lg font-semibold text-plum">{ev.t}</h3>
                            </div>
                            <span className="font-display text-lg font-bold tabular-nums text-burg">
                              {formatInr(subtotal)}
                            </span>
                          </div>
                          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white px-3 text-sm">
                            {line.seats.map((s) => (
                              <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                                <span className="font-medium text-plum">{seatLabel(s.id)}</span>
                                <span className="tabular-nums text-muted">{formatInr(s.price)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 flex flex-wrap gap-3">
                            {onEditShow ? (
                              <button
                                type="button"
                                className="text-xs font-bold text-plum hover:underline"
                                onClick={() => {
                                  handleClose();
                                  onEditShow(line.eventId);
                                }}
                              >
                                Change seats
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="text-xs font-bold text-burg hover:underline"
                              onClick={() => removeLine(line.eventId)}
                            >
                              Remove show
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <form
                    id="cart-checkout-form"
                    onSubmit={handleCheckout}
                    className="rounded-rasa border border-line bg-white p-5 shadow-xs"
                  >
                    <h3 className="font-display text-lg font-semibold text-plum">Contact &amp; single payment</h3>
                    <p className="mt-1 text-xs text-muted">
                      Pay once for all {lines.length} show{lines.length === 1 ? "" : "s"}. All QR tickets will be
                      generated together and emailed here.
                    </p>
                    <div className="mt-4 grid gap-3.5">
                      <label className="block text-sm font-semibold text-plum">
                        Full name
                        <input
                          required
                          placeholder="e.g. Ananya Sharma"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-normal text-ink"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-plum">
                        Email address
                        <input
                          required
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-normal text-ink"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-plum">
                        Phone number
                        <input
                          required
                          type="tel"
                          placeholder="10-digit mobile number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-normal text-ink"
                        />
                      </label>
                    </div>
                    <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
                      <span className="text-sm font-semibold text-muted">Grand total</span>
                      <span className="font-display text-2xl font-bold tabular-nums text-burg">
                        {formatInr(cartTotal)}
                      </span>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {!passes?.length && !result && lines.length > 0 ? (
              <div className="shrink-0 border-t border-line bg-white/95 px-4 py-3 sm:px-6 sm:py-4">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
                  <button type="button" className={btnLine} onClick={handleClose}>
                    Add more shows
                  </button>
                  <button type="submit" form="cart-checkout-form" className={btn} disabled={busy}>
                    {busy ? "Starting payment…" : cartTotal === 0 ? "Confirm free booking" : `Pay ${formatInr(cartTotal)}`}
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
