"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { byEventId, dayOf } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { btn, btnLine, lab } from "@/lib/rasa/ui";
import { sheetBackdrop, sheetPanel, duration, easeOut } from "@/lib/rasa/motion";
import { publicApi } from "@/lib/public-api";
import { TicketPasses, type PassBooking } from "./TicketPasses";

type CapacityAvailability = {
  bookingMode: string;
  capacity: number | null;
  confirmed: number;
  reserved: number;
  remaining: number | null;
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
  unitPrice: number;
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

export function WorkshopBookingSheet({ eventId, sessionId, unitPrice, onClose }: Props) {
  const reduced = useReducedMotion();
  const ev = eventId ? byEventId(eventId) : undefined;
  const open = Boolean(eventId && sessionId && ev);

  const [step, setStep] = useState<"form" | "done">("form");
  const [availability, setAvailability] = useState<CapacityAvailability | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [pass, setPass] = useState<PassBooking | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancel = false;
    setStep("form");
    setQuantity(1);
    setResult(null);
    setPass(null);
    setError(null);
    setBusy(true);
    publicApi<CapacityAvailability>(`/sessions/${sessionId}/availability`)
      .then((data) => {
        if (!cancel) setAvailability(data);
      })
      .catch((caught) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load availability");
      })
      .finally(() => {
        if (!cancel) setBusy(false);
      });
    return () => {
      cancel = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function loadPasses(bookingId: string, customerEmail: string) {
    const query = new URLSearchParams({ email: customerEmail });
    const loaded = await publicApi<PassBooking>(`/bookings/${bookingId}/status?${query}`);
    setPass(loaded);
    sessionStorage.setItem("rasa.pass", JSON.stringify({ bookingId, email: customerEmail }));
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!sessionId) return;
    setError(null);
    setBusy(true);
    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const trimmedPhone = phone.trim();
      const created = await publicApi<BookingResult>("/bookings", {
        method: "POST",
        body: {
          eventSessionId: sessionId,
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
          quantity,
          attendees: Array.from({ length: quantity }, () => ({
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
          })),
        },
      });
      setResult(created);
      setStep("done");
      if (created.booking.bookingStatus === "CONFIRMED") {
        await loadPasses(created.booking.id, created.booking.customerEmail);
        return;
      }
      if (created.checkout) {
        await openCheckout(created, {
          onPaid: () => loadPasses(created.booking.id, created.booking.customerEmail),
          onError: (message) => setError(message),
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the booking");
    } finally {
      setBusy(false);
    }
  }

  const remaining = availability?.remaining ?? null;
  const soldOut = remaining !== null && remaining <= 0;
  const maxQty = remaining !== null ? Math.min(10, Math.max(remaining, 1)) : 10;
  const total = unitPrice * quantity;

  return (
    <AnimatePresence>
      {open && ev && sessionId ? (
        <motion.div
          key={sessionId}
          role="dialog"
          aria-modal="true"
          aria-labelledby="workshop-sheet-title"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs sm:p-5"
          initial={reduced ? false : "hidden"}
          animate="visible"
          exit="exit"
          variants={reduced ? undefined : sheetBackdrop}
          transition={{ duration: duration.fast, ease: easeOut }}
          onClick={close}
        >
          <motion.div
            className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-rasa border border-line bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            initial={reduced ? false : "hidden"}
            animate="visible"
            exit="exit"
            variants={reduced ? undefined : sheetPanel}
            transition={{ duration: duration.base, ease: easeOut }}
          >
            <div className="shrink-0 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pr-2">
                  <p className={`${lab} text-[0.75rem] text-burg`}>
                    {dayOf(ev.d).long} · {fmtMinutes(ev.s)} to {fmtMinutes(ev.e)}
                  </p>
                  <h2 id="workshop-sheet-title" className="font-display text-lg leading-snug text-plum sm:text-xl">
                    {ev.t}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {ev.v} · {money(unitPrice)} per person
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-11 rounded-full px-3 font-bold text-plum hover:bg-tint"
                  onClick={close}
                  aria-label="Close workshop booking"
                >
                  ✕
                </button>
              </div>
              {error ? <p className="mt-2 text-sm text-burg">{error}</p> : null}
            </div>

            <div className="flex-1 overflow-auto px-4 py-4 sm:px-5">
              {step === "form" ? (
                busy && !availability ? (
                  <p className="text-sm text-muted">Checking slots…</p>
                ) : soldOut ? (
                  <div className="py-4">
                    <p className="font-semibold text-burg">This workshop is sold out.</p>
                    <p className="mt-1 text-sm text-muted">All {availability?.capacity} slots have been taken.</p>
                  </div>
                ) : (
                  <form id="workshop-booking-form" onSubmit={confirm} className="grid gap-4">
                    {availability?.capacity != null ? (
                      <p className="rounded-xl bg-tint px-3.5 py-2 text-sm font-medium text-plum">
                        {remaining} of {availability.capacity} slots available
                      </p>
                    ) : null}

                    <label className="block text-sm font-semibold text-plum">
                      Participants
                      <div className="mt-1 flex items-center gap-3">
                        <button
                          type="button"
                          className="flex size-10 items-center justify-center rounded-full border border-line bg-white font-bold text-plum disabled:opacity-40"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center font-display text-lg text-plum tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          className="flex size-10 items-center justify-center rounded-full border border-line bg-white font-bold text-plum disabled:opacity-40"
                          disabled={quantity >= maxQty}
                          onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        >
                          +
                        </button>
                        <span className="ml-auto font-display text-lg text-burg tabular-nums">
                          {money(total)}
                        </span>
                      </div>
                    </label>

                    <label className="block text-sm font-semibold text-plum">
                      Name
                      <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                    </label>
                    <label className="block text-sm font-semibold text-plum">
                      Email
                      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                    </label>
                    <label className="block text-sm font-semibold text-plum">
                      Phone
                      <input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                    </label>
                  </form>
                )
              ) : null}

              {step === "done" && pass ? (
                <TicketPasses pass={pass} onBookAnother={close} />
              ) : null}

              {step === "done" && !pass && result ? (
                <div>
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

            {step === "form" && !soldOut ? (
              <div className="shrink-0 border-t border-line bg-tint/70 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-center justify-between gap-3">
                  <button type="button" className={`${btnLine} min-h-11 text-sm`} onClick={close}>
                    Close
                  </button>
                  <button
                    type="submit"
                    form="workshop-booking-form"
                    className={`${btn} min-h-11 text-sm`}
                    disabled={busy || !availability}
                  >
                    {busy ? "Working…" : `Pay ${money(total)}`}
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

const inputClass =
  "mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base font-normal text-ink";

async function openCheckout(
  created: BookingResult,
  callbacks: { onPaid: () => Promise<void>; onError: (message: string) => void },
) {
  if (!created.checkout) return;
  await loadRazorpayScript();
  const Razorpay = (window as unknown as { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
  if (!Razorpay) {
    callbacks.onError("Payment window did not load.");
    return;
  }
  const checkout = new Razorpay({
    key: created.checkout.keyId,
    amount: created.checkout.amount,
    currency: created.checkout.currency,
    name: "RASA Festival",
    description: created.booking.bookingReference,
    order_id: created.checkout.orderId,
    handler: async (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      try {
        await publicApi("/payments/verify", {
          method: "POST",
          body: {
            bookingId: created.booking.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          },
        });
        await callbacks.onPaid();
      } catch (caught) {
        callbacks.onError(caught instanceof Error ? caught.message : "Payment could not be verified");
      }
    },
  });
  checkout.open();
}

function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay"));
    document.head.appendChild(script);
  });
}
