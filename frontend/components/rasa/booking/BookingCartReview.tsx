"use client";

import { useState } from "react";
import { byEventId, dayOf } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { btn, btnLine, card } from "@/lib/rasa/ui";
import { formatInr, TIER_LABEL } from "@/lib/rasa/booking-pricing";
import { useBookingCart, seatLabel } from "@/contexts/booking-cart-context";
import { CartCheckoutModal } from "./CartCheckoutModal";

type Props = {
  onAddAnother: () => void;
  onEditSeats: (eventId: string) => void;
};

export function BookingCartReview({ onAddAnother, onEditSeats }: Props) {
  const { lines, cartTotal, removeLine, clearCart } = useBookingCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (!lines.length) {
    return (
      <div className={card}>
        <h3>Your cart is empty</h3>
        <p className="text-muted">Choose an auditorium show and pick seats to see pricing here.</p>
        <button type="button" className={`${btn} mt-4`} onClick={onAddAnother}>
          Browse shows
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lines.map((line) => {
        const ev = byEventId(line.eventId);
        if (!ev) return null;
        const d = dayOf(ev.d);
        const subtotal = line.seats.reduce((n, s) => n + s.price, 0);
        return (
          <article key={line.eventId} className={`${card} border-2 border-line/80 shadow-sm`}>
            <CartLineHead ev={ev} d={d} />
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              {line.seats.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span>
                    <b className="text-plum">{seatLabel(s.id)}</b>
                    <span className="text-muted"> · {TIER_LABEL[s.tier]}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatInr(s.price)}</span>
                </li>
              ))}
            </ul>
            <CartLineFoot subtotal={subtotal} onEdit={() => onEditSeats(line.eventId)} onRemove={() => removeLine(line.eventId)} />
          </article>
        );
      })}

      <div className="rounded-rasa border-2 border-plum/20 bg-gradient-to-br from-tint to-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-lab text-xs font-semibold uppercase tracking-widest text-muted">Order total</p>
            <p className="font-display text-3xl text-burg tabular-nums">{formatInr(cartTotal)}</p>
            <p className="mt-1 text-sm text-muted">Seats are held per show. Pay at checkout when tickets go live.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnLine} onClick={onAddAnother}>
              Add another show
            </button>
            <button type="button" className={btn} onClick={() => setCheckoutOpen(true)}>
              Proceed to pay
            </button>
          </div>
        </div>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-muted underline-offset-2 hover:text-burg hover:underline"
          onClick={() => clearCart(true)}
        >
          Clear cart
        </button>
      </div>
      <CartCheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onEditShow={onEditSeats}
      />
    </div>
  );
}

function CartLineHead({
  ev,
  d,
}: {
  ev: NonNullable<ReturnType<typeof byEventId>>;
  d: ReturnType<typeof dayOf>;
}) {
  return (
    <>
      <p className="font-lab text-xs font-semibold uppercase tracking-widest text-burg">
        {d.long} · {fmtMinutes(ev.s)}
      </p>
      <h3 className="!mb-0">{ev.t}</h3>
      <p className="!mt-1 text-sm text-muted">Auditorium · Prestige Centre for Performing Arts</p>
    </>
  );
}

function CartLineFoot({
  subtotal,
  onEdit,
  onRemove,
}: {
  subtotal: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <span className="font-display text-lg text-plum tabular-nums">Subtotal {formatInr(subtotal)}</span>
      <div className="flex gap-2">
        <button type="button" className={btnLine} onClick={onEdit}>
          Change seats
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full px-4 py-2 text-sm font-bold text-burg hover:underline"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </div>
  );
}