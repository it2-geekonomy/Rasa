"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuditoriumSeatMap, type LiveSeat } from "@/components/rasa/booking/AuditoriumSeatMap";
import { TicketPasses, type PassBooking } from "@/components/rasa/booking/TicketPasses";
import { publicApi } from "@/lib/public-api";
import { btn, btnLine, card, lab, wrapTight } from "@/lib/rasa/ui";

const MAX_SEATS = 10;

type ShowSession = {
  id: string;
  sessionName: string | null;
  startAt: string;
  endAt: string;
  price: string | number;
  venue: { name: string };
};

type Show = {
  id: string;
  title: string;
  bookingMode: string;
  shortDescription: string | null;
  sessions: ShowSession[];
};

type Offer = {
  eventId: string;
  title: string;
  shortDescription: string | null;
  session: ShowSession;
};

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

type Step = "shows" | "seats" | "details" | "done";

const when = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function money(value: number) {
  if (value === 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BookingLive() {
  const searchParams = useSearchParams();
  const requestedSession = searchParams.get("session");
  const autoOpened = useRef(false);
  const [step, setStep] = useState<Step>("shows");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [seats, setSeats] = useState<Map<string, SeatOffer>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [pass, setPass] = useState<PassBooking | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (requestedSession) return;
    const saved = sessionStorage.getItem("rasa.pass");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { bookingId?: string; email?: string };
      if (parsed.bookingId && parsed.email) {
        void loadPasses(parsed.bookingId, parsed.email);
      }
    } catch {
      sessionStorage.removeItem("rasa.pass");
    }
  }, [requestedSession]);

  useEffect(() => {
    let cancel = false;
    publicApi<Show[]>("/events/published")
      .then((rows) => {
        if (cancel) return;
        const next: Offer[] = [];
        for (const show of rows) {
          if (show.bookingMode !== "SEAT_BASED") continue;
          for (const session of show.sessions) {
            next.push({
              eventId: show.id,
              title: show.title,
              shortDescription: show.shortDescription,
              session,
            });
          }
        }
        next.sort((a, b) => a.session.startAt.localeCompare(b.session.startAt));
        setOffers(next);
      })
      .catch((caught) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load shows");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (autoOpened.current || !requestedSession || offers.length === 0) return;
    const match = offers.find((item) => item.session.id === requestedSession);
    if (!match) return;
    autoOpened.current = true;
    void openShow(match);
  }, [requestedSession, offers]);

  const live = useMemo(() => {
    const map = new Map<string, LiveSeat>();
    seats.forEach((seat, key) => map.set(key, seat));
    return map;
  }, [seats]);

  const picked = [...selected].map((key) => seats.get(key)).filter((seat): seat is SeatOffer => Boolean(seat));
  const total = picked.reduce((sum, seat) => sum + seat.price, 0);
  const openCount = [...seats.values()].filter((seat) => seat.bookable).length;

  async function releaseHold() {
    if (!offer || !holdToken) return;
    const token = holdToken;
    setHoldToken(null);
    await publicApi(`/sessions/${offer.session.id}/holds/release`, {
      method: "POST",
      body: { holdToken: token },
    }).catch(() => null);
  }

  async function openShow(next: Offer) {
    setError(null);
    setBusy(true);
    setOffer(next);
    setSelected(new Set());
    setHoldToken(null);
    try {
      const layout = await publicApi<Availability>(`/sessions/${next.session.id}/availability`);
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
      setStep("seats");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load seats");
    } finally {
      setBusy(false);
    }
  }

  function toggleSeat(id: string) {
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
  }

  async function holdAndContinue() {
    if (!offer || picked.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const hold = await publicApi<{ holdToken: string }>(`/sessions/${offer.session.id}/holds`, {
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

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!offer || !holdToken) return;
    setBusy(true);
    setError(null);
    try {
      const created = await publicApi<BookingResult>("/bookings", {
        method: "POST",
        body: {
          eventSessionId: offer.session.id,
          holdToken,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
        },
      });
      setResult(created);
      sessionStorage.setItem(
        "rasa.pass",
        JSON.stringify({ bookingId: created.booking.id, email: created.booking.customerEmail }),
      );
      if (created.checkout) {
        setStep("done");
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

  async function loadPasses(bookingId: string, customerEmail: string) {
    const next = await publicApi<PassBooking>(
      `/bookings/${bookingId}/status?email=${encodeURIComponent(customerEmail)}`,
    );
    if (next.bookingStatus !== "CONFIRMED") return;
    setPass(next);
    setStep("done");
    sessionStorage.setItem("rasa.pass", JSON.stringify({ bookingId, email: customerEmail }));
  }

  function reset() {
    void releaseHold();
    sessionStorage.removeItem("rasa.pass");
    setStep("shows");
    setOffer(null);
    setSelected(new Set());
    setHoldToken(null);
    setResult(null);
    setPass(null);
    setError(null);
  }

  return (
    <div className={wrapTight}>
      {error ? <p className="mb-4 rounded-rasa border border-burg/30 bg-white px-4 py-3 text-sm text-burg">{error}</p> : null}

      {step === "shows" ? (
        <section>
          {loading ? <p className="text-muted">Loading shows…</p> : null}
          {!loading && offers.length === 0 ? (
            <p className="text-muted">No auditorium shows are published yet.</p>
          ) : null}
          <TicketLookup
            onFound={(bookingId, customerEmail) => loadPasses(bookingId, customerEmail)}
          />
          <div className="grid gap-[18px] sm:grid-cols-2">
            {offers.map((item) => (
              <button
                key={item.session.id}
                type="button"
                disabled={busy}
                onClick={() => openShow(item)}
                className={`${card} border-2 border-transparent text-left shadow-sm transition hover:border-plum/30`}
              >
                <p className={`${lab} text-burg`}>
                  {when.format(new Date(item.session.startAt))}
                  {" – "}
                  {when.format(new Date(item.session.endAt))}
                </p>
                <h3 className="!mb-1 mt-2">{item.title}</h3>
                <p>{item.session.venue.name}</p>
                {item.shortDescription ? <p className="mt-2 line-clamp-3">{item.shortDescription}</p> : null}
                <span className="mt-3 inline-block font-bold text-burg">Choose seats →</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === "seats" && offer ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={`${lab} text-burg`}>{when.format(new Date(offer.session.startAt))}</p>
              <h2 className="!mb-0 mt-1 font-display text-2xl text-plum">{offer.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {openCount === 0
                  ? "No seats are on sale yet. Grey seats stay blocked until the desk opens them."
                  : `${openCount} seats are open. Select up to ${MAX_SEATS}.`}
              </p>
            </div>
            <button type="button" className={btnLine} onClick={reset}>
              All shows
            </button>
          </div>
          <AuditoriumSeatMap selected={selected} onToggle={toggleSeat} live={live} />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-rasa border border-line bg-white p-4">
            <p className="font-semibold text-plum">
              {picked.length} seat{picked.length === 1 ? "" : "s"} · {money(total)}
            </p>
            <button type="button" className={btn} disabled={busy || picked.length === 0} onClick={holdAndContinue}>
              {busy ? "Holding…" : "Continue"}
            </button>
          </div>
        </section>
      ) : null}

      {step === "details" && offer ? (
        <form onSubmit={confirm} className={`${card} mx-auto max-w-xl space-y-4`}>
          <p className={`${lab} text-burg`}>Your details</p>
          <h2 className="!mb-0">{offer.title}</h2>
          <p>
            {picked.map((seat) => seat.label).join(", ")} · {money(total)}
          </p>
          <p className="text-sm">These seats are held for 5 minutes while you finish.</p>
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
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={btnLine}
              onClick={() => {
                void releaseHold().then(() => openShow(offer));
              }}
            >
              Back to seats
            </button>
            <button type="submit" className={btn} disabled={busy}>
              {busy ? "Booking…" : total === 0 ? "Confirm free booking" : "Pay and confirm"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "done" && pass?.bookingStatus === "CONFIRMED" ? (
        <TicketPasses pass={pass} onBookAnother={reset} />
      ) : null}

      {step === "done" && !pass && result ? (
        <div className={`${card} mx-auto max-w-xl`}>
          <p className={`${lab} text-burg`}>
            {result.booking.bookingStatus === "CONFIRMED" ? "Booking confirmed" : "Booking received"}
          </p>
          <h2 className="!mb-1">{result.booking.bookingReference}</h2>
          <p>
            {money(Number(result.booking.totalAmount))} · {result.booking.bookingStatus}
          </p>
          {result.checkout ? (
            <p className="mt-2">Payment is still pending. Complete it in the Razorpay window, or open it again below.</p>
          ) : (
            <p className="mt-2">A ticket is ready for each seat. Bring the booking reference to the auditorium.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {result.checkout ? (
              <button
                type="button"
                className={btn}
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
            <button type="button" className={btnLine} onClick={reset}>
              Back to shows
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TicketLookup({ onFound }: { onFound: (bookingId: string, email: string) => Promise<void> }) {
  const [reference, setReference] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function find(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const found = await publicApi<PassBooking>(
        `/bookings/lookup?reference=${encodeURIComponent(reference.trim())}&email=${encodeURIComponent(customerEmail.trim())}`,
      );
      if (found.bookingStatus !== "CONFIRMED") {
        setMessage("That booking is not confirmed yet.");
        return;
      }
      await onFound(found.id, found.customerEmail);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not find that booking");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={find} className={`${card} mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
      <div className="sm:col-span-3">
        <p className={`${lab} text-burg`}>Already paid?</p>
        <p className="mt-1">Enter the booking reference and email to download the QR tickets.</p>
      </div>
      <label className="block text-sm font-semibold text-plum">
        Booking reference
        <input required value={reference} onChange={(item) => setReference(item.target.value)} className={inputClass} />
      </label>
      <label className="block text-sm font-semibold text-plum">
        Email
        <input required type="email" value={customerEmail} onChange={(item) => setCustomerEmail(item.target.value)} className={inputClass} />
      </label>
      <button type="submit" className={btn} disabled={pending}>
        {pending ? "Finding…" : "Show tickets"}
      </button>
      {message ? <p className="text-sm text-burg sm:col-span-3">{message}</p> : null}
    </form>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-normal text-ink";

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
