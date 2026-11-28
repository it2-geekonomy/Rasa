"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DAYS, EV, TYPES, dayOf } from "@/lib/rasa/catalog";
import {
  PROGRAMME_REGISTRATION_SLUG,
  PROGRAMME_TICKET_SLUG,
  PROGRAMME_WORKSHOP_SLUG,
} from "@/lib/rasa/booking-events";
import type { DayId, FestivalEvent } from "@/lib/rasa/types";
import { wrapTight } from "@/lib/rasa/ui";
import { publicApi } from "@/lib/public-api";
import { PageHero } from "./PageHero";
import { EventCard } from "./EventCard";
import { PlanSidebar } from "./PlanSidebar";
import { BookingSeatSheet } from "@/components/rasa/booking/BookingSeatSheet";
import { CartCheckoutModal } from "@/components/rasa/booking/CartCheckoutModal";
import { WorkshopBookingSheet } from "@/components/rasa/booking/WorkshopBookingSheet";
import { useBookingCart } from "@/contexts/booking-cart-context";
import { formatInr } from "@/lib/rasa/booking-pricing";
import { usePlan } from "@/contexts/plan-context";
import { PageBody } from "@/components/rasa/motion/PageBody";

type PublishedEventRow = {
  id: string;
  title: string;
  slug: string;
  eventType: string;
  bookingMode: "SEAT_BASED" | "CAPACITY_BASED" | "FREE_ENTRY";
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  bannerImage: string | null;
  sessions: Array<{
    id: string;
    sessionName: string | null;
    startAt: string;
    endAt: string | null;
    capacity: number | null;
    price: string | number;
    venue: { id: string; name: string };
  }>;
  artists: Array<{
    role: string | null;
    artist: {
      id: string;
      slug: string;
      name: string;
      designation: string | null;
      profileImage: string | null;
    };
  }>;
};

type LiveProgrammeItem = {
  event: FestivalEvent;
  slug: string;
  sessionId: string;
  bookingMode: "SEAT_BASED" | "CAPACITY_BASED" | "FREE_ENTRY";
  price: number;
  bannerImage: string | null;
};

const SLUG_TO_CATALOG_ID: Record<string, string> = {
  "inauguration-and-dance": "f1",
  "organic-food-breakfast": "u2",
  ...Object.fromEntries([
    ...Object.entries(PROGRAMME_TICKET_SLUG).map(([id, slug]) => [slug, id]),
    ...Object.entries(PROGRAMME_WORKSHOP_SLUG).map(([id, slug]) => [slug, id]),
    ...Object.entries(PROGRAMME_REGISTRATION_SLUG).map(([id, slug]) => [slug, id]),
  ]),
};

function istDayAndMinutes(iso: string): { day: DayId; minutes: number } {
  // Convert UTC ISO timestamp to IST (UTC+5:30)
  const ist = new Date(Date.parse(iso) + 330 * 60 * 1000);
  const dateStr = ist.toISOString().slice(0, 10);
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const day: DayId = dateStr === "2027-01-08" ? "fri" : dateStr === "2027-01-09" ? "sat" : "sun";
  return { day, minutes };
}

function mapEventType(eventType: string): FestivalEvent["ty"] {
  if (eventType === "WORKSHOP") return "work";
  if (eventType === "WELLNESS") return "well";
  if (eventType === "EXHIBITION") return "art";
  return "perf";
}

function toLiveProgrammeItems(rows: PublishedEventRow[]): LiveProgrammeItem[] {
  const items: LiveProgrammeItem[] = [];
  for (const row of rows) {
    // Combo helper SKU is selectable inside Salsa & Jive booking sheet
    if (row.slug === "salsa-jive-combo") continue;
    const session = row.sessions[0];
    if (!session) continue;

    const catalogId = SLUG_TO_CATALOG_ID[row.slug];
    const staticMatch = catalogId ? EV.find((e) => e.id === catalogId) : undefined;
    const start = istDayAndMinutes(session.startAt);
    const end = session.endAt
      ? istDayAndMinutes(session.endAt).minutes
      : start.minutes + 60;

    const event: FestivalEvent = {
      id: catalogId ?? row.slug,
      d: start.day,
      s: start.minutes,
      e: end,
      tl: staticMatch?.tl,
      ts: staticMatch?.ts,
      t: row.title,
      w: row.shortDescription ?? staticMatch?.w ?? "",
      v: session.venue?.name ?? staticMatch?.v ?? "",
      ty: mapEventType(row.eventType),
      ws: row.eventType === "WORKSHOP" || staticMatch?.ws,
      a:
        row.artists.length > 0
          ? row.artists.map((a) => a.artist.slug)
          : staticMatch?.a,
      x: row.description
        ? `<p>${row.description.replace(/\n+/g, "</p><p>")}</p>`
        : staticMatch?.x,
      pair: staticMatch?.pair,
      img: staticMatch?.img,
      imgalt: staticMatch?.imgalt,
    };

    items.push({
      event,
      slug: row.slug,
      sessionId: session.id,
      bookingMode: row.bookingMode,
      price: Number(session.price ?? 0),
      bannerImage: row.bannerImage,
    });
  }
  items.sort((a, b) => a.event.s - b.event.s || a.event.t.localeCompare(b.event.t));
  return items;
}

type Props = { day: DayId; focusId?: string };

export function EventsProgram({ day: initialDay, focusId }: Props) {
  const { day, setDay, mobilePlanOpen, closeMobilePlan } = usePlan();
  const [type, setType] = useState("all");
  const planAsideRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const [liveItems, setLiveItems] = useState<LiveProgrammeItem[] | null>(null);
  const [sessionsBySlug, setSessionsBySlug] = useState<Map<string, { id: string; price: number }>>(new Map());
  const [ticketEventId, setTicketEventId] = useState<string | null>(null);
  const [workshopEventId, setWorkshopEventId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { lines, cartTotal, seatCount } = useBookingCart();

  useEffect(() => {
    setDay(initialDay);
  }, [initialDay, setDay]);

  useEffect(() => {
    let cancel = false;
    publicApi<PublishedEventRow[]>("/events/published")
      .then((rows) => {
        if (cancel) return;
        const next = new Map<string, { id: string; price: number }>();
        for (const row of rows) {
          const session = row.sessions[0];
          if (session) next.set(row.slug, { id: session.id, price: Number(session.price) });
        }
        setSessionsBySlug(next);
        setLiveItems(toLiveProgrammeItems(rows));
      })
      .catch(() => null);
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (focusId) {
      setType("all");
      const el = document.getElementById(`ev-${focusId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId]);

  useEffect(() => {
    if (mobilePlanOpen) {
      planAsideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [mobilePlanOpen]);

  const d = dayOf(day as DayId);
  const sourceEvents = liveItems ? liveItems.map((item) => item.event) : EV;
  const liveByEventId = new Map(liveItems?.map((item) => [item.event.id, item]) ?? []);
  const list = sourceEvents.filter(
    (e) =>
      e.d === day &&
      (type === "all" ||
        (type === "work" ? e.ty === "work" || e.ws : e.ty === type) ||
        (e.ty === "brk" && type === "perf") ||
        (e.id === "u3" && type === "perf")),
  );

  const selectedTicketSessionId = ticketEventId
    ? liveByEventId.get(ticketEventId)?.sessionId ?? sessionIdFor(ticketEventId, sessionsBySlug) ?? null
    : null;
  const selectedWorkshopLive = workshopEventId ? liveByEventId.get(workshopEventId) : undefined;
  const selectedWorkshopSession = workshopEventId
    ? selectedWorkshopLive
      ? { id: selectedWorkshopLive.sessionId, price: selectedWorkshopLive.price }
      : workshopSessionFor(workshopEventId, sessionsBySlug)
    : undefined;

  return (
    <>
      <PageHero
        tight
        title="RASA Festival January 2027"
        lead="Three days at PCPA. Tap a session for details. Tick to save your plan."
      />
      <PageBody className={`${wrapTight} max-md:pb-28`}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex w-full gap-2 max-md:w-full" role="group" aria-label="Day">
            {DAYS.map((x) => (
              <button
                key={x.id}
                type="button"
                className={
                  day === x.id
                    ? "flex min-h-[58px] flex-1 flex-col items-start rounded-xl border-2 border-plum bg-plum px-3 py-2 text-left max-md:min-h-0"
                    : "flex min-h-[58px] flex-1 flex-col items-start rounded-xl border-2 border-line bg-white px-3 py-2 text-left max-md:min-h-0"
                }
                aria-pressed={day === x.id}
                onClick={() => router.push(`/events/${x.id}`)}
              >
                <small
                  className={`font-lab text-[0.8rem] font-semibold uppercase tracking-widest ${
                    day === x.id ? "text-white" : "text-muted"
                  }`}
                >
                  {x.short}
                </small>
                <b className={`font-display text-lg ${day === x.id ? "text-white" : "text-plum"}`}>
                  {x.num}
                </b>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 max-md:mb-2.5 max-md:flex-nowrap max-md:gap-1.5 max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by type">
          {TYPES.map((t) => (
            <button
              key={t[0]}
              type="button"
              className={
                type === t[0]
                  ? "min-h-11 shrink-0 rounded-full border-2 border-burg bg-burg px-4 py-2 font-bold text-white max-md:min-h-8 max-md:px-3 max-md:py-1 max-md:text-xs"
                  : "min-h-11 shrink-0 rounded-full border-2 border-line bg-white px-4 py-2 font-medium max-md:min-h-8 max-md:px-3 max-md:py-1 max-md:text-xs"
              }
              aria-pressed={type === t[0]}
              onClick={() => setType(t[0])}
            >
              {t[1]}
            </button>
          ))}
        </div>
        <VenueKey />
        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="mb-3 text-muted">
              <b>{d.long}.</b> {d.info}
            </p>
            {list.length ? (
              list.map((e) => {
                const live = liveByEventId.get(e.id);
                const noBookingRequired =
                  e.id === "f1" || live?.slug === "inauguration-and-dance";
                const onPickTickets = noBookingRequired
                  ? undefined
                  : live
                    ? live.bookingMode === "SEAT_BASED"
                      ? () => setTicketEventId(e.id)
                      : () => setWorkshopEventId(e.id)
                    : sessionIdFor(e.id, sessionsBySlug)
                      ? () => setTicketEventId(e.id)
                      : workshopSessionFor(e.id, sessionsBySlug)
                        ? () => setWorkshopEventId(e.id)
                        : undefined;
                return (
                  <EventCard
                    key={e.id}
                    event={e}
                    bannerImage={live?.bannerImage ?? null}
                    defaultOpen={focusId === e.id}
                    onPickTickets={onPickTickets}
                  />
                );
              })
            ) : (
              <p className="text-[0.9rem] text-muted">
                Nothing in this filter on {d.long}. Try another filter.
              </p>
            )}
          </div>
          <PlanSidebar
            ref={planAsideRef}
            mobileOpen={mobilePlanOpen}
            onMobileClose={closeMobilePlan}
            onOpenCart={() => setCartOpen(true)}
            onEditShow={(id) => setTicketEventId(id)}
          />
        </div>
      </PageBody>
      <BookingSeatSheet
        eventId={ticketEventId}
        sessionId={selectedTicketSessionId}
        onClose={() => setTicketEventId(null)}
        onOpenCart={() => setCartOpen(true)}
      />
      <CartCheckoutModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onEditShow={(id) => setTicketEventId(id)}
      />
      {seatCount > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md px-3 lg:hidden">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-plum/20 bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur-md">
            <div className="min-w-0">
              <p className="truncate font-display text-xs font-bold text-plum">
                {seatCount} seat{seatCount === 1 ? "" : "s"} · {lines.length} show{lines.length === 1 ? "" : "s"}
              </p>
              <p className="font-lab text-xs font-bold text-burg tabular-nums">
                {formatInr(cartTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="shrink-0 rounded-full bg-burg px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-burg-d"
            >
              Checkout &amp; pay
            </button>
          </div>
        </div>
      ) : null}
      <WorkshopBookingSheet
        eventId={workshopEventId}
        sessionId={selectedWorkshopSession?.id ?? null}
        unitPrice={selectedWorkshopSession?.price ?? 0}
        combo={
          (workshopEventId === "s1" || workshopEventId === "s1b") && sessionsBySlug.get("salsa-jive-combo")
            ? {
                sessionId: sessionsBySlug.get("salsa-jive-combo")!.id,
                price: sessionsBySlug.get("salsa-jive-combo")!.price,
                label: "Salsa & Jive together (2 hours)",
              }
            : null
        }
        onClose={() => setWorkshopEventId(null)}
      />
    </>
  );
}

function sessionIdFor(eventId: string, sessionsBySlug: Map<string, { id: string; price: number }>) {
  const slug = PROGRAMME_TICKET_SLUG[eventId];
  return slug ? sessionsBySlug.get(slug)?.id : undefined;
}

function workshopSessionFor(eventId: string, sessionsBySlug: Map<string, { id: string; price: number }>) {
  const regSlug = PROGRAMME_REGISTRATION_SLUG[eventId];
  if (regSlug) return sessionsBySlug.get(regSlug);
  const slug = PROGRAMME_WORKSHOP_SLUG[eventId];
  const found = slug ? sessionsBySlug.get(slug) : undefined;
  return found && found.price > 0 ? found : undefined;
}

function VenueKey() {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2 gap-y-2 text-[0.9rem] text-muted max-md:mb-2.5 max-md:gap-x-3 max-md:gap-y-1 max-md:text-xs" role="group" aria-label="Venue colours">
      {[
        ["sw-amph", "#f4dce0", "Amphitheatre"],
        ["sw-aud", "#ece1ed", "Auditorium"],
        ["sw-art", "#fff", "Art shows"],
        ["sw-other", "#fff", "Rehearsal Studio and Banquet Hall"],
      ].map(([cls, bg, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <i
            className="inline-block size-[18px] rounded-[5px] border border-[#cdb9cf] max-md:size-3.5"
            style={{ background: bg }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}