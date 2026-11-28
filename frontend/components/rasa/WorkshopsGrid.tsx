"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DAYS, EV, dayOf, ARTISTS } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { card, gridAnimItem, lnk } from "@/lib/rasa/ui";
import { duration, easeOut } from "@/lib/rasa/motion";
import { ScrollStagger } from "@/components/rasa/motion/ScrollStagger";
import { publicApi } from "@/lib/public-api";
import { PROGRAMME_WORKSHOP_SLUG } from "@/lib/rasa/booking-events";
import { parseBannerImages } from "@/lib/rasa/banner-images";
import { formatInr } from "@/lib/rasa/booking-pricing";
import type { DayId } from "@/lib/rasa/types";
import { WorkshopBookingSheet } from "@/components/rasa/booking/WorkshopBookingSheet";

type PosterPreview = {
  src: string;
  alt: string;
  title: string;
};

type PublishedWorkshopRow = {
  id: string;
  title: string;
  slug: string;
  bookingMode: string;
  shortDescription: string | null;
  description: string | null;
  bannerImage: string | null;
  sessions: Array<{
    id: string;
    startAt: string;
    endAt: string | null;
    capacity: number | null;
    price: string | number;
    venue: { name: string };
  }>;
  artists: Array<{
    artist: { slug: string; name: string };
  }>;
};

type WorkshopCardItem = {
  id: string;
  slug: string;
  sessionId: string;
  day: DayId;
  startMinutes: number;
  endMinutes: number;
  title: string;
  subtitle: string;
  venue: string;
  description: string;
  price: number;
  priceLabel: string;
  capacityLabel: string | null;
  posterUrl: string | null;
  artists: Array<{ slug: string; name: string }>;
};

const SLUG_TO_WORKSHOP_ID: Record<string, string> = Object.fromEntries(
  Object.entries(PROGRAMME_WORKSHOP_SLUG).map(([id, slug]) => [slug, id]),
);

function istDayAndMinutes(iso: string): { day: DayId; minutes: number } {
  const ist = new Date(Date.parse(iso) + 330 * 60 * 1000);
  const dateStr = ist.toISOString().slice(0, 10);
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const day: DayId = dateStr === "2027-01-08" ? "fri" : dateStr === "2027-01-09" ? "sat" : "sun";
  return { day, minutes };
}

export function WorkshopsGrid() {
  const [wsday, setWsday] = useState("all");
  const [preview, setPreview] = useState<PosterPreview | null>(null);
  const [workshops, setWorkshops] = useState<WorkshopCardItem[]>([]);
  const [comboSession, setComboSession] = useState<{ sessionId: string; price: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingItem, setBookingItem] = useState<WorkshopCardItem | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancel = false;
    publicApi<PublishedWorkshopRow[]>("/events/published")
      .then((rows) => {
        if (cancel) return;
        const items: WorkshopCardItem[] = [];
        let combo: { sessionId: string; price: number } | null = null;

        for (const row of rows) {
          if (row.bookingMode !== "CAPACITY_BASED") continue;
          const session = row.sessions[0];
          if (!session) continue;

          if (row.slug === "salsa-jive-combo") {
            combo = { sessionId: session.id, price: Number(session.price) };
            continue;
          }

          const catalogId = SLUG_TO_WORKSHOP_ID[row.slug];
          const staticMatch = catalogId ? EV.find((e) => e.id === catalogId) : undefined;
          const start = istDayAndMinutes(session.startAt);
          const end = session.endAt ? istDayAndMinutes(session.endAt).minutes : start.minutes + 60;
          const price = Number(session.price ?? 0);
          const banners = parseBannerImages(row.bannerImage);

          const priceLabel =
            staticMatch?.price ??
            (price > 0 ? `${formatInr(price)} per person` : "Free");

          const capacityLabel =
            session.capacity != null
              ? `Limited to ${session.capacity} participants`
              : staticMatch?.seats ?? null;

          const artists =
            row.artists.length > 0
              ? row.artists.map((a) => ({ slug: a.artist.slug, name: a.artist.name }))
              : (staticMatch?.a ?? [])
                  .map((id) => ARTISTS.find((a) => a.id === id))
                  .filter((a): a is NonNullable<typeof a> => Boolean(a))
                  .map((a) => ({ slug: a.id, name: a.n }));

          items.push({
            id: catalogId ?? row.slug,
            slug: row.slug,
            sessionId: session.id,
            day: start.day,
            startMinutes: start.minutes,
            endMinutes: end,
            title: row.title,
            subtitle: staticMatch?.w ?? row.shortDescription ?? "",
            venue: session.venue?.name ?? staticMatch?.v ?? "",
            description:
              row.description ?? (staticMatch?.x ? staticMatch.x.replace(/<[^>]+>/g, "") : ""),
            price,
            priceLabel,
            capacityLabel,
            posterUrl: banners[0] ?? null,
            artists,
          });
        }

        items.sort((a, b) => {
          const dayOrder = { fri: 0, sat: 1, sun: 2 };
          return (
            dayOrder[a.day] - dayOrder[b.day] ||
            a.startMinutes - b.startMinutes ||
            a.title.localeCompare(b.title)
          );
        });

        setComboSession(combo);
        setWorkshops(items);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const list = workshops.filter((e) => wsday === "all" || e.day === wsday);
  const dayOpts: [string, string][] = [
    ["all", "All days"],
    ...DAYS.filter((d) => workshops.some((e) => e.day === d.id)).map(
      (d) => [d.id, d.long] as [string, string],
    ),
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Day">
        {dayOpts.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              wsday === id
                ? "min-h-11 rounded-full border-2 border-burg bg-burg px-4 py-2 font-bold text-white"
                : "min-h-11 rounded-full border-2 border-line bg-white px-4 py-2 font-medium"
            }
            aria-pressed={wsday === id}
            onClick={() => setWsday(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {loading && workshops.length === 0 ? (
        <p className="text-sm text-muted">Loading workshops…</p>
      ) : (
        <ScrollStagger className="grid grid-cols-3 items-stretch gap-[18px] max-md:grid-cols-1">
          {list.map((e) => (
            <div key={e.id} data-scroll-item className={gridAnimItem}>
              <div className={`${card} flex h-full min-h-0 flex-col gap-1.5`}>
                {e.posterUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreview({ src: e.posterUrl!, alt: e.title, title: e.title })}
                    className="group block w-full cursor-zoom-in overflow-hidden rounded-rasa p-0 text-left"
                    aria-label={`View full poster for ${e.title}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.posterUrl}
                      alt={e.title}
                      className="aspect-[16/9] h-auto w-full object-cover object-[50%_40%] transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </button>
                ) : null}
                <div className="font-lab text-sm font-semibold uppercase tracking-wider text-burg">
                  {dayOf(e.day).short} {dayOf(e.day).num}, {fmtMinutes(e.startMinutes)} to{" "}
                  {fmtMinutes(e.endMinutes)}
                </div>
                <h3 className="font-display text-xl font-semibold text-plum">{e.title}</h3>
                {e.subtitle ? <p className="text-muted">{e.subtitle}</p> : null}
                <p className="text-muted">{e.venue}</p>
                {e.description ? (
                  <p className="text-[0.95rem] text-muted">{e.description}</p>
                ) : null}
                <div className="font-display text-[1.4rem] font-bold text-burg">
                  {e.priceLabel}
                </div>
                {e.capacityLabel ? (
                  <p className="text-[0.9rem] text-muted">{e.capacityLabel}</p>
                ) : null}
                {e.artists.length ? (
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {e.artists.map((a) => (
                      <Link key={a.slug} href={`/artists/${a.slug}`} className={lnk}>
                        About {a.name}
                      </Link>
                    ))}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  {e.price > 0 ? (
                    <button
                      type="button"
                      className="min-h-11 rounded-full border-2 border-burg bg-burg px-4 py-2 font-bold text-white"
                      onClick={() => setBookingItem(e)}
                    >
                      Book workshop
                    </button>
                  ) : null}
                  <Link
                    href={`/events/${e.day}?focus=${e.id}`}
                    className="inline-flex min-h-11 items-center rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum no-underline"
                  >
                    See in programme
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </ScrollStagger>
      )}
      <AnimatePresence>
        {preview ? (
          <motion.div
            key={preview.src}
            role="dialog"
            aria-modal="true"
            aria-label={preview.title}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: duration.fast, ease: easeOut }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={reduced ? false : { scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? undefined : { scale: 0.96, opacity: 0 }}
              transition={{ duration: duration.fast, ease: easeOut }}
              className="relative flex max-h-[92dvh] max-w-[94vw] flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close full poster"
                className="self-end rounded-full bg-white/95 px-3.5 py-1.5 text-sm font-bold text-plum shadow-lg hover:bg-white"
              >
                ✕ Close
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.src}
                alt={preview.alt}
                className="max-h-[82dvh] w-auto max-w-[92vw] rounded-rasa object-contain shadow-2xl"
              />
              <p className="text-center font-display text-base font-semibold text-white">
                {preview.title}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <WorkshopBookingSheet
        eventId={bookingItem?.id ?? null}
        sessionId={bookingItem?.sessionId ?? null}
        unitPrice={bookingItem?.price ?? 0}
        combo={
          (bookingItem?.slug === "salsa-workshop" || bookingItem?.slug === "jive-workshop") &&
          comboSession
            ? {
                sessionId: comboSession.sessionId,
                price: comboSession.price,
                label: "Salsa & Jive together (2 hours)",
              }
            : null
        }
        onClose={() => setBookingItem(null)}
      />
    </>
  );
}
