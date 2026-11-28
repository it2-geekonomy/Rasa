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
import { publicApi } from "@/lib/public-api";
import {
  AUDITORIUM_SEATS,
  parseSeatId,
  seatId,
  type SeatAllocation,
  selectableAllocation,
} from "@/lib/rasa/auditorium-seats";
import {
  priceForRow,
  tierForAllocation,
  type TicketTier,
} from "@/lib/rasa/booking-pricing";

const STORAGE = "rasa-booking-cart";

export type BookedSeat = {
  id: string;
  eventSeatId?: string;
  row: string;
  col: number;
  allocation: SeatAllocation;
  tier: TicketTier;
  price: number;
};

export type BookingLine = {
  eventId: string;
  sessionId?: string;
  holdToken?: string;
  holdExpiresAt?: string;
  seats: BookedSeat[];
};

type SessionSeatInput = {
  id: string;
  eventSeatId: string;
  row: string;
  col: number;
  price: number;
};

type BookingCartContextValue = {
  lines: BookingLine[];
  setEventSeats: (eventId: string, seatIds: string[]) => void;
  setSessionSeats: (
    eventId: string,
    sessionId: string,
    seats: SessionSeatInput[],
    hold?: { holdToken: string; expiresAt: string },
  ) => void;
  removeLine: (eventId: string) => void;
  clearCart: (releaseHolds?: boolean) => void;
  lineForEvent: (eventId: string) => BookingLine | undefined;
  cartTotal: number;
  seatCount: number;
  earliestExpiryMs: number | null;
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
      price: priceForRow(meta.row),
    });
  }
  return out;
}

function releaseLineHold(line: BookingLine | undefined) {
  if (!line?.sessionId || !line.holdToken) return;
  void publicApi(`/sessions/${line.sessionId}/holds/release`, {
    method: "POST",
    body: { holdToken: line.holdToken },
  }).catch(() => null);
}

function isLineExpired(line: BookingLine, now: number) {
  if (!line.holdExpiresAt) return false;
  const ms = Date.parse(line.holdExpiresAt);
  return Number.isFinite(ms) && ms <= now;
}

export function BookingCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BookingLine[]>([]);

  const persist = useCallback((next: BookingLine[]) => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const parsed = JSON.parse(raw) as BookingLine[];
      if (Array.isArray(parsed)) {
        const now = Date.now();
        const active = parsed.filter((l) => !isLineExpired(l, now));
        setLines(active);
        if (active.length !== parsed.length) persist(active);
      }
    } catch {
      /* ignore */
    }
  }, [persist]);

  useEffect(() => {
    const hasExpiring = lines.some((l) => Boolean(l.holdExpiresAt));
    if (!hasExpiring) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setLines((prev) => {
        const active = prev.filter((l) => !isLineExpired(l, now));
        if (active.length === prev.length) return prev;
        persist(active);
        return active;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lines, persist]);

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

  const setSessionSeats = useCallback(
    (
      eventId: string,
      sessionId: string,
      seats: SessionSeatInput[],
      hold?: { holdToken: string; expiresAt: string },
    ) => {
      const mapped: BookedSeat[] = seats.map((s) => {
        const meta = seatById.get(s.id);
        const allocation = meta?.allocation ?? "available";
        const tier = tierForAllocation(allocation) ?? "standard";
        return {
          id: s.id,
          eventSeatId: s.eventSeatId,
          row: s.row,
          col: s.col,
          allocation,
          tier,
          price: s.price,
        };
      });
      setLines((prev) => {
        const old = prev.find((l) => l.eventId === eventId);
        if (old?.holdToken && old.holdToken !== hold?.holdToken) {
          releaseLineHold(old);
        }
        const rest = prev.filter((l) => l.eventId !== eventId);
        const next = mapped.length
          ? [
              ...rest,
              {
                eventId,
                sessionId,
                holdToken: hold?.holdToken,
                holdExpiresAt: hold?.expiresAt,
                seats: mapped,
              },
            ]
          : rest;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeLine = useCallback(
    (eventId: string) => {
      setLines((prev) => {
        const target = prev.find((l) => l.eventId === eventId);
        releaseLineHold(target);
        const next = prev.filter((l) => l.eventId !== eventId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearCart = useCallback(
    (releaseHolds = true) => {
      setLines((prev) => {
        if (releaseHolds) {
          for (const line of prev) releaseLineHold(line);
        }
        persist([]);
        return [];
      });
    },
    [persist],
  );

  const lineForEvent = useCallback(
    (eventId: string) => lines.find((l) => l.eventId === eventId),
    [lines],
  );

  const { cartTotal, seatCount, earliestExpiryMs } = useMemo(() => {
    let cartTotal = 0;
    let seatCount = 0;
    let earliestExpiryMs: number | null = null;
    for (const line of lines) {
      if (line.holdExpiresAt) {
        const ms = Date.parse(line.holdExpiresAt);
        if (Number.isFinite(ms) && (earliestExpiryMs === null || ms < earliestExpiryMs)) {
          earliestExpiryMs = ms;
        }
      }
      for (const s of line.seats) {
        cartTotal += s.price;
        seatCount += 1;
      }
    }
    return { cartTotal, seatCount, earliestExpiryMs };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      setEventSeats,
      setSessionSeats,
      removeLine,
      clearCart,
      lineForEvent,
      cartTotal,
      seatCount,
      earliestExpiryMs,
    }),
    [lines, setEventSeats, setSessionSeats, removeLine, clearCart, lineForEvent, cartTotal, seatCount, earliestExpiryMs],
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