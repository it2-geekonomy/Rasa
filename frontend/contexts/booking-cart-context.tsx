"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AUDITORIUM_SEATS,
  parseSeatId,
  seatId,
  type SeatAllocation,
  selectableAllocation,
} from "@/lib/rasa/auditorium-seats";
import {
  TIER_PRICE_INR,
  tierForAllocation,
  type TicketTier,
} from "@/lib/rasa/booking-pricing";

const STORAGE = "rasa-booking-cart";

export type BookedSeat = {
  id: string;
  row: string;
  col: number;
  allocation: SeatAllocation;
  tier: TicketTier;
  price: number;
};

export type BookingLine = {
  eventId: string;
  seats: BookedSeat[];
};

type BookingCartContextValue = {
  lines: BookingLine[];
  setEventSeats: (eventId: string, seatIds: string[]) => void;
  removeLine: (eventId: string) => void;
  clearCart: () => void;
  lineForEvent: (eventId: string) => BookingLine | undefined;
  cartTotal: number;
  seatCount: number;
};

const BookingCartContext = createContext<BookingCartContextValue | null>(null);

const seatById = new Map(AUDITORIUM_SEATS.map((s) => [seatId(s.row, s.col), s]));

function idsToSeats(seatIds: string[]): BookedSeat[] {
  const out: BookedSeat[] = [];
  for (const id of seatIds) {
    const meta = seatById.get(id);
    if (!meta || !selectableAllocation(meta.allocation)) continue;
    const tier = tierForAllocation(meta.allocation);
    if (!tier) continue;
    out.push({
      id,
      row: meta.row,
      col: meta.col,
      allocation: meta.allocation,
      tier,
      price: TIER_PRICE_INR[tier],
    });
  }
  return out;
}

export function BookingCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BookingLine[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const parsed = JSON.parse(raw) as BookingLine[];
      if (Array.isArray(parsed)) setLines(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: BookingLine[]) => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setEventSeats = useCallback(
    (eventId: string, seatIds: string[]) => {
      const seats = idsToSeats(seatIds);
      setLines((prev) => {
        const rest = prev.filter((l) => l.eventId !== eventId);
        const next = seats.length ? [...rest, { eventId, seats }] : rest;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeLine = useCallback(
    (eventId: string) => {
      setLines((prev) => {
        const next = prev.filter((l) => l.eventId !== eventId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearCart = useCallback(() => {
    setLines([]);
    persist([]);
  }, [persist]);

  const lineForEvent = useCallback(
    (eventId: string) => lines.find((l) => l.eventId === eventId),
    [lines],
  );

  const { cartTotal, seatCount } = useMemo(() => {
    let cartTotal = 0;
    let seatCount = 0;
    for (const line of lines) {
      for (const s of line.seats) {
        cartTotal += s.price;
        seatCount += 1;
      }
    }
    return { cartTotal, seatCount };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      setEventSeats,
      removeLine,
      clearCart,
      lineForEvent,
      cartTotal,
      seatCount,
    }),
    [lines, setEventSeats, removeLine, clearCart, lineForEvent, cartTotal, seatCount],
  );

  return <BookingCartContext.Provider value={value}>{children}</BookingCartContext.Provider>;
}

export function useBookingCart() {
  const ctx = useContext(BookingCartContext);
  if (!ctx) throw new Error("useBookingCart must be used within BookingCartProvider");
  return ctx;
}

export function seatIdsFromLine(line: BookingLine | undefined) {
  return line?.seats.map((s) => s.id) ?? [];
}

export function seatLabel(id: string) {
  const { row, col } = parseSeatId(id);
  return `Row ${row}, Seat ${col}`;
}