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

/** Programme cards that share one live auditorium session. */
export const PROGRAMME_TICKET_SLUG: Record<string, string> = {
  f5: "three-forces-agam-band",
  s8: "kathak-and-bharatanatyam",
  s9: "kathak-and-bharatanatyam",
  s14: "dance-alchemy-and-nimishambha",
  s10: "dance-alchemy-and-nimishambha",
  s12: "fusion-express",
  u10: "warriors-path-and-mahabharata",
  u11: "warriors-path-and-mahabharata",
};