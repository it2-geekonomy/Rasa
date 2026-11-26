import { EV } from "@/lib/rasa/catalog";
import type { FestivalEvent } from "@/lib/rasa/types";

/** Auditorium performances that use the interactive seat map. */
export function isAuditoriumTicketEvent(e: FestivalEvent): boolean {
  return e.v === "Auditorium" && e.ty === "perf";
}

export const AUDITORIUM_TICKET_EVENTS = EV.filter(isAuditoriumTicketEvent);

export function bookingPathForEvent(eventId: string) {
  return `/booking?event=${encodeURIComponent(eventId)}`;
}