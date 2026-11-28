"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { duration, easeOut } from "@/lib/rasa/motion";

type VenuePhoto = {
  src: string;
  alt: string;
};

type VenueSection = {
  id: string;
  title: string;
  subtitle: string;
  photos: VenuePhoto[];
};

const VENUE_SECTIONS: VenueSection[] = [
  {
    id: "auditorium",
    title: "Auditorium",
    subtitle: "Main performance hall for evening concerts and productions.",
    photos: [
      { src: "/venue/Auditorium 1.jpg", alt: "PCPA Auditorium — view 1" },
      { src: "/venue/Auditorium 2.jpg", alt: "PCPA Auditorium — view 2" },
      { src: "/venue/Auditorium 3.jpg", alt: "PCPA Auditorium — view 3" },
    ],
  },
  {
    id: "amphitheatre",
    title: "Amphitheatre",
    subtitle: "Open-air stage for the inauguration, discussions, and daytime sessions.",
    photos: [
      { src: "/venue/Amphi 1.webp", alt: "PCPA Amphitheatre overview" },
      { src: "/venue/Amphitheatre 1.jpg", alt: "PCPA Amphitheatre — view 1" },
      { src: "/venue/Amphitheatre 2.jpg", alt: "PCPA Amphitheatre — view 2" },
      { src: "/venue/Amphitheatre 3.jpg", alt: "PCPA Amphitheatre — view 3" },
    ],
  },
  {
    id: "studios-banquet",
    title: "Rehearsal Studio & Banquet Hall",
    subtitle: "Dedicated workshop studios, banquet space, and the Swasti Gallery exhibition.",
    photos: [
      { src: "/venue/Studio1.jpg", alt: "Rehearsal Studio 1" },
      { src: "/venue/Studio 2.jpeg", alt: "Studio 2" },
      { src: "/venue/Banquet.jpg", alt: "Banquet Hall" },
    ],
  },
  {
    id: "spaces",
    title: "Lobby, Green Rooms & Spaces",
    subtitle: "Foyer, concession area, backstage green rooms, and venue interiors.",
    photos: [
      { src: "/venue/PCPA Lobby 1.jpg", alt: "PCPA Lobby — view 1" },
      { src: "/venue/PCPA Lobby 2.jpg", alt: "PCPA Lobby — view 2" },
      { src: "/venue/Concession Stand Right.jpg", alt: "Concession stand" },
      { src: "/venue/Green Room 1.jpg", alt: "Artist green room" },
      { src: "/venue/VIP Green Room.jpg", alt: "VIP green room" },
      { src: "/venue/SAN_1104.jpg", alt: "PCPA venue view" },
      { src: "/venue/SAN_1106.jpg", alt: "PCPA venue interior" },
      { src: "/venue/SAN_1108.jpg", alt: "PCPA venue hall" },
      { src: "/venue/SAN_1109.jpg", alt: "PCPA venue space" },
      { src: "/venue/SAN_9042.jpg", alt: "PCPA venue architecture" },
      { src: "/venue/SAN_9043.jpg", alt: "PCPA venue seating area" },
      { src: "/venue/SAN_9086.jpg", alt: "PCPA venue grounds" },
    ],
  },
];

export function VenueGallery() {
  const [filter, setFilter] = useState<string>("all");
  const [preview, setPreview] = useState<VenuePhoto | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const visibleSections =
    filter === "all" ? VENUE_SECTIONS : VENUE_SECTIONS.filter((s) => s.id === filter);

  return (
    <div className="mt-3 space-y-8">
      <div
        className="flex flex-wrap gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter venue photos by area"
      >
        <button
          type="button"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
          className={
            filter === "all"
              ? "min-h-10 shrink-0 rounded-full border-2 border-burg bg-burg px-4 py-1.5 text-sm font-bold text-white"
              : "min-h-10 shrink-0 rounded-full border-2 border-line bg-white px-4 py-1.5 text-sm font-medium text-ink hover:bg-tint"
          }
        >
          All areas
        </button>
        {VENUE_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={filter === s.id}
            onClick={() => setFilter(s.id)}
            className={
              filter === s.id
                ? "min-h-10 shrink-0 rounded-full border-2 border-burg bg-burg px-4 py-1.5 text-sm font-bold text-white"
                : "min-h-10 shrink-0 rounded-full border-2 border-line bg-white px-4 py-1.5 text-sm font-medium text-ink hover:bg-tint"
            }
          >
            {s.title}
          </button>
        ))}
      </div>

      {visibleSections.map((section) => (
        <section key={section.id} className="space-y-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-plum">{section.title}</h3>
            <p className="text-sm text-muted">{section.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.photos.map((photo) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setPreview(photo)}
                className="group overflow-hidden rounded-rasa border border-line bg-tint/40 text-left shadow-xs transition hover:border-plum/30 hover:shadow-md"
                aria-label={`View ${photo.alt}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={800}
                  height={500}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="block aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </button>
            ))}
          </div>
        </section>
      ))}

      <AnimatePresence>
        {preview ? (
          <motion.div
            key={preview.src}
            role="dialog"
            aria-modal="true"
            aria-label={preview.alt}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: duration.fast, ease: easeOut }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={reduced ? false : { scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? undefined : { scale: 0.96, opacity: 0 }}
              transition={{ duration: duration.fast, ease: easeOut }}
              className="flex max-h-[92dvh] max-w-[94vw] flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="self-end rounded-full bg-white/95 px-3.5 py-1.5 text-sm font-bold text-plum shadow-lg hover:bg-white"
              >
                ✕ Close
              </button>
              <Image
                src={preview.src}
                alt={preview.alt}
                width={1600}
                height={1067}
                sizes="92vw"
                className="max-h-[80dvh] w-auto max-w-[92vw] rounded-rasa object-contain shadow-2xl"
              />
              <p className="text-center font-display text-sm font-semibold text-white sm:text-base">
                {preview.alt}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
