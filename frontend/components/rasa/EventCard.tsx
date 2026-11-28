"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { duration, easeOut } from "@/lib/rasa/motion";
import type { FestivalEvent } from "@/lib/rasa/types";
import { ARTISTS, TLAB } from "@/lib/rasa/catalog";
import { fmtMinutes } from "@/lib/rasa/time";
import { lnk } from "@/lib/rasa/ui";
import { parseBannerImages } from "@/lib/rasa/banner-images";
import { RasaImage } from "./RasaImage";
import { usePlan } from "@/contexts/plan-context";
import { useToast } from "@/contexts/toast-context";

function venueClass(v?: string, t?: string) {
  if (/art (show|exhibition)/i.test(t || "")) return "v-art bg-white";
  if (v === "Amphitheatre") return "v-amph bg-[#f4dce0]";
  if (v === "Auditorium") return "v-aud bg-[#ece1ed]";
  return "v-other bg-white";
}

function typeBorder(ty: string) {
  if (ty === "work") return "border-l-burg";
  if (ty === "well") return "border-l-[#b27ab5]";
  if (ty === "art") return "border-l-[#c9a8cb]";
  return "border-l-plum";
}

type Props = {
  event: FestivalEvent;
  bannerImage?: string | null;
  defaultOpen?: boolean;
  /** Opens the seat card for a show that is on sale. */
  onPickTickets?: () => void;
};

export function EventCard({ event: e, bannerImage, defaultOpen, onPickTickets }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const reduced = useReducedMotion();
  const { plan, togglePlan } = usePlan();
  const { toast } = useToast();
  const onPlan = plan.includes(e.id);
  const artists = (e.a || [])
    .map((id) => ARTISTS.find((a) => a.id === id))
    .filter(Boolean);

  if (e.ty === "brk") {
    return (
      <div className="px-1.5 pb-3.5 text-muted italic">
        {fmtMinutes(e.s)} to {fmtMinutes(e.e)}: Break
      </div>
    );
  }

  const moreDefault = e.x
    ? e.x
    : "<p>Details coming soon.</p>";

  return (
    <article
      id={`ev-${e.id}`}
      className={`mb-2.5 grid grid-cols-[96px_1fr_48px] items-start gap-3.5 rounded-rasa border border-line border-l-[6px] p-4 pl-4 max-md:mb-2 max-md:grid-cols-[3.9rem_1fr_2.4rem] max-md:gap-2 max-md:rounded-xl max-md:p-2.5 max-md:pl-2.5 ${typeBorder(e.ty)} ${venueClass(e.v, e.t)}`}
    >
      <div className="font-lab text-[1.05rem] font-semibold leading-snug tracking-wide text-plum max-md:text-[0.82rem]">
        {e.tl || fmtMinutes(e.s)}
        {e.tl ? (
          e.ts ? (
            <small className="mt-0 block text-[0.85rem] font-medium text-muted max-md:text-[0.72rem]">{e.ts}</small>
          ) : null
        ) : (
          <small className="block text-[0.85rem] font-medium text-muted max-md:text-[0.72rem]">to {fmtMinutes(e.e)}</small>
        )}
      </div>
      <div>
        <button
          type="button"
          className="min-h-11 w-full p-0 text-left max-md:min-h-0"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="block text-[1.05rem] font-bold leading-snug max-md:text-[0.94rem]">{e.t}</span>
          {e.w ? <span className="block text-[0.95rem] text-muted max-md:text-xs">{e.w}</span> : null}
          <span className="mt-1.5 flex flex-wrap gap-1.5 max-md:mt-1 max-md:gap-1">
            {e.v ? (
              <span className="inline-block rounded-full bg-tint2 px-3 py-0.5 text-[0.85rem] font-medium text-plum max-md:px-2 max-md:py-0.5 max-md:text-[0.72rem]">
                {e.v}
              </span>
            ) : null}
            <span className="inline-block rounded-full border border-line bg-white px-3 py-0.5 text-[0.85rem] font-medium text-plum max-md:px-2 max-md:py-0.5 max-md:text-[0.72rem]">
              {TLAB[e.ty]}
            </span>
            {e.pair ? (
              <span className="inline-block max-w-full rounded-2xl border border-plum bg-white px-3.5 py-1.5 text-left text-[0.85rem] font-medium text-plum max-md:px-2.5 max-md:py-1 max-md:text-xs">
                {e.pair}
              </span>
            ) : null}
          </span>
        </button>
        {onPickTickets ? (
          <button
            type="button"
            className="mt-2.5 inline-flex min-h-11 items-center rounded-full border-2 border-plum bg-white px-4 py-2 text-sm font-bold text-plum hover:bg-tint max-md:mt-1.5 max-md:min-h-8 max-md:px-3 max-md:py-1 max-md:text-xs"
            onClick={onPickTickets}
          >
            Get tickets
          </button>
        ) : null}
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="more"
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduced ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: duration.fast, ease: easeOut }}
              className="overflow-hidden"
            >
          <div className="mt-2.5 border-t border-dashed border-line pt-2.5 text-[0.95rem] text-muted">
            <div dangerouslySetInnerHTML={{ __html: moreDefault }} />
            <p className="mt-1.5">
              <b>
                {e.dl || (e.nt ? "Open for all" : `${fmtMinutes(e.s)}–${fmtMinutes(e.e)}`)}
              </b>
              {e.v ? ` in the ${e.v}` : ""}.
              {e.price ? <> <b>{e.price}</b>.</> : null}
              {e.seats ? ` ${e.seats}.` : null}
            </p>
            {artists.length ? (
              <p className="mt-1.5">
                {artists.map((a, i) => (
                  <span key={a!.id}>
                    {i > 0 ? " · " : ""}
                    <Link href={`/artists/${a!.id}`} className={lnk}>
                      {a!.n}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
            {parseBannerImages(bannerImage).length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-3">
                {parseBannerImages(bannerImage).map((url, idx) => (
                  <img
                    key={`${url}-${idx}`}
                    src={url}
                    alt={`${e.t}${idx > 0 ? ` (${idx + 1})` : ""}`}
                    className="max-h-[360px] w-full max-w-[420px] rounded-xl border border-line object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            ) : bannerImage === undefined && e.img?.length ? (
              <>
                <div className="mt-2.5 flex flex-wrap gap-3">
                  {e.img.map((k, i) => (
                    <RasaImage
                      key={k}
                      img={k}
                      alt={`${e.imgalt?.[i] || e.t}. Tap to enlarge.`}
                      className="max-w-[420px] flex-[0_1_420px] cursor-zoom-in !aspect-[4/5]"
                      width={420}
                      height={525}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[0.9rem] text-muted">Tap a poster to enlarge it.</p>
              </>
            ) : null}
          </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <button
        type="button"
        className="star tick"
        aria-pressed={onPickTickets ? undefined : onPlan}
        aria-label={
          onPickTickets
            ? `Get tickets: ${e.t}`
            : `${onPlan ? "Remove from" : "Add to"} my plan: ${e.t}`
        }
        onClick={() => {
          if (onPickTickets) {
            onPickTickets();
            return;
          }
          togglePlan(e.id);
          toast(onPlan ? `Removed: ${e.t}` : `Added: ${e.t}`);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <polyline points="5 12.5 10 17.5 19 7" />
        </svg>
      </button>
    </article>
  );
}
