"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DAYS, EV, dayOf, ARTISTS } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { card, gridAnimItem, lnk } from "@/lib/rasa/ui";
import { duration, easeOut } from "@/lib/rasa/motion";
import { RasaImage } from "./RasaImage";
import { usePlan } from "@/contexts/plan-context";
import { ScrollStagger } from "@/components/rasa/motion/ScrollStagger";
import { publicApi } from "@/lib/public-api";
import { PROGRAMME_WORKSHOP_SLUG } from "@/lib/rasa/booking-events";
import { WorkshopBookingSheet } from "@/components/rasa/booking/WorkshopBookingSheet";

type PosterPreview = {
  img: string;
  alt: string;
  title: string;
};

type LiveWorkshop = {
  sessionId: string;
  price: number;
};

export function WorkshopsGrid() {
  const [wsday, setWsday] = useState("all");
  const [preview, setPreview] = useState<PosterPreview | null>(null);
  const [liveBySlug, setLiveBySlug] = useState<Map<string, LiveWorkshop>>(new Map());
  const [bookingEventId, setBookingEventId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const { plan, togglePlan } = usePlan();

  useEffect(() => {
    let cancel = false;
    publicApi<Array<{ slug: string; sessions: Array<{ id: string; price: string | number }> }>>("/events/published")
      .then((rows) => {
        if (cancel) return;
        const next = new Map<string, LiveWorkshop>();
        for (const row of rows) {
          const session = row.sessions[0];
          if (session) next.set(row.slug, { sessionId: session.id, price: Number(session.price) });
        }
        setLiveBySlug(next);
      })
      .catch(() => null);
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
  const list = EV.filter((e) => e.ws && (wsday === "all" || e.d === wsday));
  const dayOpts: [string, string][] = [
    ["all", "All days"],
    ...DAYS.filter((d) => EV.some((e) => e.ws && e.d === d.id)).map((d) => [d.id, d.long] as [string, string]),
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
      <ScrollStagger className="grid grid-cols-3 items-stretch gap-[18px] max-md:grid-cols-1">
        {list.map((e) => {
          const on = plan.includes(e.id);
          return (
            <div key={e.id} data-scroll-item className={gridAnimItem}>
            <div className={`${card} flex h-full min-h-0 flex-col gap-1.5`}>
              {e.pic ? (
                <button
                  type="button"
                  onClick={() => setPreview({ img: e.pic!, alt: e.palt || e.t, title: e.t })}
                  className="group block w-full cursor-zoom-in overflow-hidden rounded-rasa p-0 text-left"
                  aria-label={`View full poster for ${e.t}`}
                >
                  <RasaImage
                    img={e.pic}
                    alt={e.palt || e.t}
                    className="h-auto aspect-[16/9]! transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{ aspectRatio: "16 / 9", objectPosition: e.pp || "50% 40%" }}
                    width={800}
                    height={450}
                  />
                </button>
              ) : null}
              <div className="font-lab text-sm font-semibold uppercase tracking-wider text-burg">
                {dayOf(e.d).short} {dayOf(e.d).num}, {fmtMinutes(e.s)} to {fmtMinutes(e.e)}
              </div>
              <h3 className="font-display text-xl font-semibold text-plum">{e.t}</h3>
              {e.w ? <p className="text-muted">{e.w}</p> : null}
              <p className="text-muted">{e.v}</p>
              {e.x ? <p className="text-[0.95rem] text-muted">{e.x.replace(/<[^>]+>/g, "")}</p> : null}
              <div className="font-display text-[1.4rem] font-bold text-burg">{e.price || "Price to come"}</div>
              {!e.price ? <p className="text-[0.9rem] text-muted">Each workshop is priced separately.</p> : null}
              {e.seats ? <p className="text-[0.9rem] text-muted">{e.seats}</p> : null}
              {e.a?.length ? (
                <p className="mt-1">
                  {e.a.map((id) => {
                    const a = ARTISTS.find((x) => x.id === id);
                    return a ? (
                      <Link key={id} href={`/artists/${id}`} className={lnk}>
                        About {a.n}
                      </Link>
                    ) : null;
                  })}
                </p>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {(() => {
                  const slug = PROGRAMME_WORKSHOP_SLUG[e.id];
                  const live = slug ? liveBySlug.get(slug) : undefined;
                  if (!live || live.price <= 0) return null;
                  return (
                    <button
                      type="button"
                      className="min-h-11 rounded-full border-2 border-burg bg-burg px-4 py-2 font-bold text-white"
                      onClick={() => setBookingEventId(e.id)}
                    >
                      Book workshop
                    </button>
                  );
                })()}
                <Link
                  href={`/events/${e.d}?focus=${e.id}`}
                  className="inline-flex min-h-11 items-center rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum no-underline"
                >
                  See in programme
                </Link>
              </div>
            </div>
            </div>
          );
        })}
      </ScrollStagger>
      <AnimatePresence>
        {preview ? (
          <motion.div
            key={preview.img}
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
              <RasaImage
                img={preview.img}
                alt={preview.alt}
                className="max-h-[82dvh]! w-auto! max-w-[92vw]! rounded-rasa bg-transparent! object-contain! shadow-2xl"
                width={1600}
                height={1200}
              />
              <p className="text-center font-display text-base font-semibold text-white">{preview.title}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <WorkshopBookingSheet
        eventId={bookingEventId}
        sessionId={bookingEventId ? liveBySlug.get(PROGRAMME_WORKSHOP_SLUG[bookingEventId])?.sessionId ?? null : null}
        unitPrice={bookingEventId ? liveBySlug.get(PROGRAMME_WORKSHOP_SLUG[bookingEventId])?.price ?? 0 : 0}
        onClose={() => setBookingEventId(null)}
      />
    </>
  );
}