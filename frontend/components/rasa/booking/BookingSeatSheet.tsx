"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { byEventId, dayOf } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { btn, btnLine, lab } from "@/lib/rasa/ui";
import { sheetBackdrop, sheetPanel, duration, easeOut } from "@/lib/rasa/motion";
import { publicApi } from "@/lib/public-api";
import { AuditoriumSeatMap, type LiveSeat } from "./AuditoriumSeatMap";
import { TicketPasses, type PassBooking } from "./TicketPasses";

const MAX_SEATS = 10;

type SeatOffer = LiveSeat & { price: number; label: string };

type Availability = {
  sections: Array<{
    seats: Array<{
      eventSeatId: string;
      rowLabel: string;
      seatNumber: number;
      seatLabel: string;
      seatType: string;
      price: string | number;
      status: string;
      bookable: boolean;
    }>;
  }>;
};

type BookingResult = {
  booking: {
    id: string;
    bookingReference: string;
    bookingStatus: string;
    totalAmount: string | number;
    customerEmail: string;
  };
  checkout: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
  } | null;
};

type Props = {
  eventId: string | null;
  sessionId: string | null;
  onClose: () => void;
};

function money(value: number) {
  if (value === 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BookingSeatSheet({ eventId, sessionId, onClose }: Props) {
  const reduced = useReducedMotion();
  const ev = eventId ? byEventId(eventId) : undefined;
  const open = Boolean(eventId && sessionId && ev);
  const [step, setStep] = useState<"seats" | "details" | "done">("seats");
  const [seats, setSeats] = useState<Map<string, SeatOffer>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [pass, setPass] = useState<PassBooking | null>(null);
  const holdRef = useRef<string | null>(null);

  useEffect(() => {
    holdRef.current = holdToken;
  }, [holdToken]);

  const release = useCallback(async (token: string, id: string) => {
    await publicApi(`/sessions/${id}/holds/release`, {
      method: "POST",
      body: { holdToken: token },
    }).catch(() => null);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancel = false;
    setStep("seats");
    setSelected(new Set());
    setHoldToken(null);
    setResult(null);
    setPass(null);
    setError(null);
    setBusy(true);
    publicApi<Availability>(`/sessions/${sessionId}/availability`)
      .then((layout) => {
        if (cancel) return;
        const map = new Map<string, SeatOffer>();
        for (const section of layout.sections ?? []) {
          for (const seat of section.seats) {
            map.set(`${seat.rowLabel}-${seat.seatNumber}`, {
              eventSeatId: seat.eventSeatId,
              bookable: seat.bookable,
              status: seat.status,
              seatType: seat.seatType,
              price: Number(seat.price),
              label: seat.seatLabel,
            });
          }
        }
        setSeats(map);
      })
      .catch((caught) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load seats");
      })
      .finally(() => {
        if (!cancel) setBusy(false);
      });
    return () => {
      cancel = true;
      const token = holdRef.current;
      if (token) void release(token, sessionId);
    };
  }, [sessionId, release]);

  const live = useMemo(() => {
    const map = new Map<string, LiveSeat>();
    seats.forEach((seat, key) => map.set(key, seat));
    return map;
  }, [seats]);

  const picked = [...selected].map((key) => seats.get(key)).filter((seat): seat is SeatOffer => Boolean(seat));
  const total = picked.reduce((sum, seat) => sum + seat.price, 0);

  const toggleSeat = useCallback(
    (id: string) => {
      const seat = seats.get(id);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else if (seat?.bookable && next.size < MAX_SEATS) next.add(id);
        return next;
      });
      if (seat?.bookable && !selected.has(id) && selected.size >= MAX_SEATS) {
        setError(`You can hold up to ${MAX_SEATS} seats at a time.`);
      } else {
        setError(null);
      }
    },
    [seats, selected],
  );

  function close() {
    const token = holdToken;
    const id = sessionId;
    setHoldToken(null);
    holdRef.current = null;
    if (token && id) void release(token, id);
    onClose();
  }

  async function holdAndContinue() {
    if (!sessionId || picked.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const hold = await publicApi<{ holdToken: string }>(`/sessions/${sessionId}/holds`, {
        method: "POST",
        body: { eventSeatIds: picked.map((seat) => seat.eventSeatId) },
      });
      setHoldToken(hold.holdToken);
      setStep("details");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not hold those seats");
    } finally {
      setBusy(false);
    }
  }

  async function loadPasses(bookingId: string, customerEmail: string) {
    const next = await publicApi<PassBooking>(
      `/bookings/${bookingId}/status?email=${encodeURIComponent(customerEmail)}`,
    );
    if (next.bookingStatus !== "CONFIRMED") return;
    setPass(next);
    setStep("done");
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!sessionId || !holdToken) return;
    setBusy(true);
    setError(null);
    try {
      const created = await publicApi<BookingResult>("/bookings", {
        method: "POST",
        body: {
          eventSessionId: sessionId,
          holdToken,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
        },
      });
      holdRef.current = null;
      setHoldToken(null);
      setResult(created);
      sessionStorage.setItem(
        "rasa.pass",
        JSON.stringify({ bookingId: created.booking.id, email: created.booking.customerEmail }),
      );
      setStep("done");
      if (created.checkout) {
        openCheckout(created, {
          onPaid: () => loadPasses(created.booking.id, created.booking.customerEmail),
          onError: (message) => setError(message),
        });
      } else {
        await loadPasses(created.booking.id, created.booking.customerEmail);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete the booking");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && ev && sessionId ? (
        <motion.div
          key={eventId}
          className="fixed inset-0 z-[60] flex bg-white"
          role="dialog"
          aria-labelledby="seat-sheet-title"
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
            <div className="shrink-0 border-b border-line px-3 py-2.5 sm:px-5 sm:py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pr-2">
                  <p className={`${lab} text-[0.65rem] text-burg sm:text-[0.85rem]`}>
                    {dayOf(ev.d).long} · {fmtMinutes(ev.s)}
                  </p>
                  <h2 id="seat-sheet-title" className="font-display text-[0.95rem] leading-snug text-plum sm:text-xl">
                    {ev.t}
                  </h2>
                  <p className="mt-0.5 hidden text-sm text-muted sm:block">
                    {step === "seats" ? "Pick seats on the map below." : "Finish the booking for these seats."}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-11 rounded-full px-3 font-bold text-plum hover:bg-tint"
                  onClick={close}
                  aria-label="Close seat picker"
                >
                  ✕
                </button>
              </div>
              {error ? <p className="mt-2 text-sm text-burg">{error}</p> : null}
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-5 sm:py-4">
              {step === "seats" ? (
                busy && seats.size === 0 ? (
                  <p className="text-sm text-muted">Loading seats…</p>
                ) : (
                  <AuditoriumSeatMap variant="sheet" selected={selected} onToggle={toggleSeat} live={live} />
                )
              ) : null}
              {step === "details" ? (
                <form id="seat-sheet-details" onSubmit={confirm} className="mx-auto grid w-full max-w-xl gap-4 overflow-auto">
                  <p>
                    {picked.map((seat) => seat.label).join(", ")} · {money(total)}
                  </p>
                  <p className="text-sm">These seats are held for 5 minutes while you finish.</p>
                  <label className="block text-sm font-semibold text-plum">
                    Name
                    <input required value={name} onChange={(item) => setName(item.target.value)} className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-plum">
                    Email
                    <input required type="email" value={email} onChange={(item) => setEmail(item.target.value)} className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-plum">
                    Phone
                    <input required value={phone} onChange={(item) => setPhone(item.target.value)} className={inputClass} />
                  </label>
                </form>
              ) : null}
              {step === "done" && pass ? (
                <div className="overflow-auto">
                  <TicketPasses pass={pass} onBookAnother={close} />
                </div>
              ) : null}
              {step === "done" && !pass && result ? (
                <div className="mx-auto max-w-xl">
                  <p className={`${lab} text-burg`}>{result.booking.bookingReference}</p>
                  <p className="mt-2">
                    {money(Number(result.booking.totalAmount))} · {result.booking.bookingStatus}
                  </p>
                  {result.checkout ? (
                    <button
                      type="button"
                      className={`${btn} mt-4`}
                      onClick={() =>
                        openCheckout(result, {
                          onPaid: () => loadPasses(result.booking.id, result.booking.customerEmail),
                          onError: (message) => setError(message),
                        })
                      }
                    >
                      Open payment
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-line bg-white/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(36,20,38,.08)] backdrop-blur-sm sm:bg-tint/80 sm:px-5 sm:py-4 sm:pb-4 sm:shadow-none">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="font-display text-sm text-plum sm:text-lg">
                  {step === "seats" ? (
                    picked.length ? (
                      <>
                        {picked.length} seat{picked.length === 1 ? "" : "s"} · <span className="text-burg">{money(total)}</span>
                      </>
                    ) : (
                      "Tap seats — drag the map to scroll"
                    )
                  ) : (
                    <span>
                      {picked.length} seat{picked.length === 1 ? "" : "s"} · {money(total)}
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {step === "details" ? (
                    <button
                      type="button"
                      className={`${btnLine} w-full min-h-11 text-sm sm:w-auto`}
                      onClick={() => {
                        const token = holdToken;
                        setHoldToken(null);
                        holdRef.current = null;
                        if (token) void release(token, sessionId);
                        setStep("seats");
                      }}
                    >
                      Back to seats
                    </button>
                  ) : (
                    <button type="button" className={`${btnLine} w-full min-h-11 text-sm sm:w-auto`} onClick={close}>
                      Cancel
                    </button>
                  )}
                  {step === "seats" ? (
                    <button type="button" className={`${btn} w-full min-h-11 text-sm sm:w-auto`} disabled={busy || picked.length === 0} onClick={holdAndContinue}>
                      {busy ? "Holding…" : "Continue"}
                    </button>
                  ) : null}
                  {step === "details" ? (
                    <button type="submit" form="seat-sheet-details" className={`${btn} w-full min-h-11 text-sm sm:w-auto`} disabled={busy}>
                      {busy ? "Booking…" : total === 0 ? "Confirm free booking" : "Pay and confirm"}
                    </button>
                  ) : null}
                  {step === "done" ? (
                    <button type="button" className={`${btn} w-full min-h-11 text-sm sm:w-auto`} onClick={close}>
                      Close
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const inputClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-normal text-ink";

type RazorpayHandler = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

function openCheckout(
  result: BookingResult,
  handlers: { onPaid: () => Promise<void>; onError: (message: string) => void },
) {
  const checkout = result.checkout;
  if (!checkout || typeof window === "undefined") return;
  const start = () => {
    const Razorpay = (window as Window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
    if (!Razorpay) return;
    const client = new Razorpay({
      key: checkout.keyId,
      amount: checkout.amount,
      currency: checkout.currency,
      order_id: checkout.orderId,
      name: "RASA Festival",
      description: result.booking.bookingReference,
      handler: async (response: RazorpayHandler) => {
        try {
          await publicApi("/payments/verify", {
            method: "POST",
            body: {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            },
          });
          await handlers.onPaid();
        } catch (caught) {
          handlers.onError(caught instanceof Error ? caught.message : "Payment could not be confirmed");
        }
      },
    });
    client.open();
  };
  if ((window as Window & { Razorpay?: unknown }).Razorpay) {
    start();
    return;
  }
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = start;
  document.body.appendChild(script);
}
