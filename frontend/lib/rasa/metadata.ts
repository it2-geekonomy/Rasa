import type { Metadata } from "next";
import { ARTISTS } from "@/lib/rasa/catalog";

/** Exact handover format: `Programme | RASA, Roots to Rhythm` */
export const SITE_TITLE = "RASA, Roots to Rhythm";

const PAGE_TITLES: Record<string, string> = {
  home: "Home",
  events: "Programme",
  workshops: "Workshops",
  exhibitions: "Art Exhibitions",
  stalls: "Stalls",
  artists: "Artists",
  booking: "Tickets",
  faq: "FAQ",
  about: "Why RASA",
  team: "Team",
  sponsors: "Sponsors",
  partners: "Make a difference",
  venue: "Festival Venue",
};

/** Handover `app.js` title map — used for `document.title` on client navigations (mobile tabs). */
export function pageTitleLabel(pathname: string): string {
  const clean = pathname.replace(/\/$/, "") || "/";
  if (clean.startsWith("/artists/") && clean !== "/artists") {
    const id = clean.split("/")[2] ?? "";
    const artist = ARTISTS.find((a) => a.id === id);
    return artist?.n ?? "Artist";
  }
  const segment = clean.replace(/^\//, "").split("/")[0] || "home";
  if (segment === "events") return PAGE_TITLES.events;
  return PAGE_TITLES[segment] ?? "RASA";
}

export function formatDocumentTitle(page: string): string {
  return `${page} | ${SITE_TITLE}`;
}

export function rasaTitle(page: string): Metadata {
  return { title: formatDocumentTitle(page) };
}
