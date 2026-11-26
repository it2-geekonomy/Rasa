"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ACAT, ARTISTS, SOON } from "@/lib/rasa/catalog";
import { card, gridAnimItem, lnk } from "@/lib/rasa/ui";
import { RasaImage } from "./RasaImage";
import { ContactRow } from "./ContactRow";
import { ScrollStagger } from "@/components/rasa/motion/ScrollStagger";

const PRI = [
  "mallika",
  "vyjayanthi",
  "bickram",
  "ghatam",
  "anuradha",
  "nimishambha",
  "agam",
  "harish",
  "atha",
  "sumanth",
  "labonee",
  "aagnika",
  "shruthi",
];

function rk(id: string) {
  const i = PRI.indexOf(id);
  return i < 0 ? (ARTISTS.some((a) => a.id === id) ? 50 : 60) : i;
}

export function ArtistsGrid() {
  const [acat, setAcat] = useState("all");

  const items = useMemo(() => {
    const L = ARTISTS.filter((a) => acat === "all" || a.c === acat);
    const Q = SOON.filter((a) => acat === "all" || a[2] === acat);
    type Row =
      | { k: string; i: number; type: "full"; artist: (typeof L)[0] }
      | { k: string; i: number; type: "soon"; soon: (typeof Q)[0] };
    const rows: Row[] = [
      ...L.map((a, i) => ({ k: a.id, i, type: "full" as const, artist: a })),
      ...Q.map((a, i) => ({ k: a[0], i: i + 100, type: "soon" as const, soon: a })),
    ];
    rows.forEach((x, idx) => (x.i = idx));
    rows.sort((p, q) => rk(p.k) - rk(q.k) || p.i - q.i);
    return rows;
  }, [acat]);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter artists">
        {ACAT.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              acat === id
                ? "min-h-11 rounded-full border-2 border-burg bg-burg px-4 py-2 font-bold text-white"
                : "min-h-11 rounded-full border-2 border-line bg-white px-4 py-2 font-medium"
            }
            aria-pressed={acat === id}
            onClick={() => setAcat(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <ScrollStagger className="grid grid-cols-4 items-stretch gap-[18px] max-md:grid-cols-2 max-[520px]:grid-cols-1">
        {items.map((x) =>
          x.type === "full" ? (
            <div key={x.k} data-scroll-item className={gridAnimItem}>
            <Link href={`/artists/${x.artist.id}`} className="block h-full no-underline hover:[&_h4]:underline">
              {x.artist.img.length ? (
                <RasaImage
                  img={x.artist.img[0]}
                  alt={x.artist.n}
                  className="!aspect-[4/5] hover:brightness-105"
                  style={{ objectPosition: x.artist.pos || "50% 30%" }}
                  width={500}
                  height={625}
                />
              ) : (
                <div className="grid aspect-[4/5] place-items-center rounded-rasa border-2 border-dashed border-[#c9b0cd] bg-[repeating-linear-gradient(45deg,#faf6fb,#faf6fb_10px,#f2e8f3_10px,#f2e8f3_20px)] p-3 text-center text-[0.85rem] text-[#7d5f82]">
                  Photo to come
                </div>
              )}
              <h4 className="mt-2.5 font-body text-[1.05rem] font-bold text-plum">{x.artist.n}</h4>
              <p className="text-[0.95rem] text-muted">{x.artist.r}</p>
            </Link>
            </div>
          ) : (
            <div key={x.k} data-scroll-item className={gridAnimItem}>
            <div className={`${card} h-full`}>
              {x.soon[5] ? (
                <SoonLogoTile img={x.soon[5]} alt={`${x.soon[0]}, The Contemporary Art Gallery`} />
              ) : (
                <div className="mb-3 grid aspect-[4/5] place-items-center rounded-rasa border-2 border-dashed border-[#c9b0cd] bg-[repeating-linear-gradient(45deg,#faf6fb,#faf6fb_10px,#f2e8f3_10px,#f2e8f3_20px)] p-3 text-center text-[0.85rem] text-[#7d5f82]">
                  Photo to come
                </div>
              )}
              <h4 className="font-body text-[1.05rem] font-bold text-plum">{x.soon[0]}</h4>
              <p className="text-muted">{x.soon[1]}</p>
              {x.soon[3] ? (
                <ContactRow contact={{ ig: x.soon[3], ig2: x.soon[4] || undefined }} />
              ) : null}
            </div>
            </div>
          ),
        )}
      </ScrollStagger>
    </>
  );
}

function SoonLogoTile({ img, alt }: { img: string; alt: string }) {
  return (
    <div className="mb-3 grid aspect-[4/5] place-items-center rounded-rasa border border-line bg-white p-[18px]">
      <RasaImage img={img} alt={alt} width={600} height={260} className="!h-auto !w-full !rounded-none !bg-white" />
    </div>
  );
}