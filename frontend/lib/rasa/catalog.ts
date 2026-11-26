import daysJson from "../../public/data/days.json";
import eventsJson from "../../public/data/events.json";
import artistsJson from "../../public/data/artists.json";
import faqJson from "../../public/data/faq.json";
import policiesJson from "../../public/data/policies.json";
import postersJson from "../../public/data/posters-and-workshops.json";
import type { Artist, Day, DayId, FestivalEvent, SoonArtist } from "./types";

export const DAYS = daysJson as Day[];

export const TYPES = [
  ["all", "All events"],
  ["perf", "Performances and talks"],
  ["work", "Workshops"],
  ["well", "Wellness"],
  ["art", "Art and food"],
] as const;

export const TLAB: Record<string, string> = {
  perf: "Performance",
  work: "Workshop",
  well: "Wellness",
  art: "Art and food",
  brk: "Break",
};

export const ACAT = [
  ["all", "All"],
  ["music", "Music"],
  ["dance", "Dance"],
  ["well", "Wellness and more"],
] as const;

export const SOON: SoonArtist[] = [
  [
    "Swasti Gallery",
    "Saturday art exhibition",
    "well",
    "swasti_gallery",
    undefined,
    "swasti-logo",
  ],
];

const posters = postersJson.posters_by_event_id as unknown as Record<
  string,
  [string, string][]
>;

function attachPosters(events: FestivalEvent[]): FestivalEvent[] {
  return events.map((e) => {
    const p = posters[e.id];
    if (!p) return e;
    return {
      ...e,
      img: p.map((x) => x[0]),
      imgalt: p.map((x) => x[1]),
    };
  });
}

function sortEvents(events: FestivalEvent[]): FestivalEvent[] {
  return [...events].sort(
    (a, b) =>
      DAYS.findIndex((d) => d.id === a.d) -
        DAYS.findIndex((d) => d.id === b.d) ||
      a.s - b.s ||
      (a.o || 0) - (b.o || 0) ||
      a.e - b.e,
  );
}

export const EV = sortEvents(attachPosters(eventsJson as FestivalEvent[]));
export const ARTISTS = artistsJson as Artist[];
export const FAQ = faqJson as [string, string][];
export const POLICY = policiesJson as [
  string,
  string[],
  string[]?,
][];

export function dayOf(id: DayId) {
  return DAYS.find((d) => d.id === id)!;
}

export function byEventId(id: string) {
  return EV.find((e) => e.id === id);
}

export function byArtistId(id: string) {
  return ARTISTS.find((a) => a.id === id);
}