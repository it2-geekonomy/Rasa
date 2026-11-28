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
  s14: "dance-alchemy-and-nimishambha",
  s12: "fusion-express",
  u10: "warriors-path-and-mahabharata",
};

/** Workshop cards mapped to their live session slug. */
export const PROGRAMME_WORKSHOP_SLUG: Record<string, string> = {
  s4: "kolu-kalaripayattu",
  s1: "salsa-workshop",
  s1b: "jive-workshop",
  s2a: "sound-healing-session-1",
  s2b: "sound-healing-session-2",
  s3: "art-of-drumming",
  s5: "yoga-raaga",
  u1: "dance-fitness",
  u4: "meipadam-workshop",
  u5: "bharatanatyam-dikshitar-kriti",
  u6: "carving-rhythm-linocut",
  u7: "fusion-culinary-exploration",
};

/** Free-entry programme items that still take registration. */
export const PROGRAMME_REGISTRATION_SLUG: Record<string, string> = {};