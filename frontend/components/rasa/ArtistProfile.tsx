"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ARTISTS, EV, DAYS, dayOf, byArtistId } from "@/lib/rasa/catalog";
import { fetchPublicArtistBySlug, resolveArtistImageUrl, type PublicArtist } from "@/lib/rasa/artists-api";
import { fmtMinutes } from "@/lib/rasa/time";
import { wrapTight, lnk, lab } from "@/lib/rasa/ui";
import { RasaImage } from "./RasaImage";
import { ContactRow } from "./ContactRow";
type Props = { id: string };

const WIDE_IMGS = new Set([
  "vk-1",
  "vk-2",
  "mal-3",
  "nim-stage",
  "nim-three",
  "banjo-hand",
  "banjo-live",
  "ws-action",
  "ws-stage",
  "Art of Drumming-01",
  "venkat-stage",
  "venkat-stage2",
  "quinten-b",
  "ghatam-pots",
  "ghatam-three-pots",
]);

const sessionWhen = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function ArtistProfile({ id }: Props) {
  const local = byArtistId(id);
  const [live, setLive] = useState<PublicArtist | null>(null);

  useEffect(() => {
    let cancel = false;
    fetchPublicArtistBySlug(id)
      .then((data) => {
        if (!cancel) setLive(data);
      })
      .catch(() => null);
    return () => {
      cancel = true;
    };
  }, [id]);

  const a = local ?? ARTISTS[0];
  const name = live?.name ?? local?.n ?? a.n;
  const role = live?.designation ?? local?.r ?? a.r;
  const bio = live?.biography
    ? live.biography.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : (local?.bio ?? a.bio);
  const contact = live?.socialLinks
    ? {
        ig: live.socialLinks.ig ?? local?.ct?.ig,
        ig2: live.socialLinks.ig2 ?? local?.ct?.ig2,
        web: live.socialLinks.web ?? local?.ct?.web,
        ph: live.socialLinks.ph ?? local?.ct?.ph,
        phl: live.socialLinks.phl ?? local?.ct?.phl,
        em: live.socialLinks.em ?? local?.ct?.em,
      }
    : local?.ct;
  const cred = live?.socialLinks?.credit ?? local?.cred;

  const livePrimaryImg = resolveArtistImageUrl(live?.profileImage);
  const liveGalleryImgs = (live?.photos ?? [])
    .map((p) => resolveArtistImageUrl(p.imageUrl))
    .filter((u): u is string => Boolean(u) && u !== livePrimaryImg);

  const hasLivePhotos = Boolean(livePrimaryImg || liveGalleryImgs.length);

  const evs = (local?.ev || [])
    .map((eid) => EV.find((e) => e.id === eid))
    .filter(Boolean)
    .sort(
      (x, y) =>
        DAYS.findIndex((d) => d.id === x!.d) - DAYS.findIndex((d) => d.id === y!.d) || x!.s - y!.s,
    );

  const liveSessions =
    live?.events?.flatMap((link) =>
      (link.event.sessions ?? []).map((s) => ({
        id: s.id,
        title: link.event.title,
        startAt: s.startAt,
        venue: s.venue?.name,
        bookingMode: link.event.bookingMode,
      })),
    ) ?? [];

  return (
    <>
      <div className="bg-plum text-white py-11 max-md:py-7">
        <div className="mx-auto max-w-[1240px] px-6 max-md:px-4">
          <ArtistHero name={name} role={role} />
        </div>
      </div>
      <div className={wrapTight}>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" id="a-cols">
          <div>
            {bio.map((p) => (
              <p key={p.slice(0, 40)} className="mb-3 text-[1.05rem] text-muted">
                {p}
              </p>
            ))}
            {contact && Object.values(contact).some(Boolean) ? <ContactRow contact={contact} /> : null}
            {local?.logo ? (
              <a
                href={local.logo.href}
                target="_blank"
                rel="noopener noreferrer"
                className="my-3.5 inline-flex min-h-24 min-w-[min(240px,100%)] items-center justify-center rounded-rasa bg-white px-5 py-3"
                aria-label={`${local.logo.alt} (opens in a new tab)`}
              >
                <RasaImage img={local.logo.img} alt={local.logo.alt} width={600} height={260} className="!h-[72px] !w-auto !rounded-none" />
              </a>
            ) : null}
            {cred ? (
              <p className="text-[0.9rem] text-muted" dangerouslySetInnerHTML={{ __html: cred }} />
            ) : null}
            {liveSessions.length > 0 || evs.length > 0 ? (
              <>
                <h3 className="mt-7 font-display text-xl font-semibold text-plum">At RASA</h3>
                <div className="my-4 grid gap-2">
                  {liveSessions.length > 0
                    ? liveSessions.map((s) => (
                        <Link
                          key={s.id}
                          href={s.bookingMode === "SEAT_BASED" ? `/booking?session=${s.id}` : "/events"}
                          className="flex min-h-12 items-center gap-3.5 rounded-[10px] bg-tint px-3.5 py-2.5 no-underline max-[520px]:flex-col max-[520px]:items-start max-[520px]:gap-0.5"
                        >
                          <b className="min-w-[160px] font-lab tracking-wide text-burg max-[520px]:min-w-0">
                            {sessionWhen.format(new Date(s.startAt))}
                          </b>
                          <span>
                            {s.title}
                            {s.venue ? `, ${s.venue}` : ""}
                          </span>
                        </Link>
                      ))
                    : evs.map((e) => (
                        <Link
                          key={e!.id}
                          href={`/events/${e!.d}?focus=${e!.id}`}
                          className="flex min-h-12 items-center gap-3.5 rounded-[10px] bg-tint px-3.5 py-2.5 no-underline max-[520px]:flex-col max-[520px]:items-start max-[520px]:gap-0.5"
                        >
                          <b className="min-w-[130px] font-lab tracking-wide text-burg max-[520px]:min-w-0">
                            {dayOf(e!.d).short} {dayOf(e!.d).num}, {e!.tl || fmtMinutes(e!.s)}
                          </b>
                          <span>
                            {e!.t}
                            {e!.v ? `, ${e!.v}` : ""}
                          </span>
                        </Link>
                      ))}
                </div>
              </>
            ) : null}
          </div>
          <div>
            {hasLivePhotos ? (
              livePrimaryImg ? (
                <img
                  src={livePrimaryImg}
                  alt={local?.altn || name}
                  className="block aspect-[4/5] w-full rounded-rasa bg-plum-d object-cover"
                  style={{ objectPosition: local?.pos || "50% 30%" }}
                />
              ) : (
                <PhotoPlaceholder />
              )
            ) : local?.img.length ? (
              <RasaImage
                img={local.img[0]}
                alt={local.altn || name}
                className="!aspect-[4/5]"
                style={{ objectPosition: local.pos || "50% 30%" }}
                width={600}
                height={750}
              />
            ) : (
              <PhotoPlaceholder />
            )}
          </div>
        </div>
        {hasLivePhotos && liveGalleryImgs.length > 0 ? (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
            {liveGalleryImgs.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`${local?.altn || name}, photo ${i + 2}`}
                className="block aspect-[4/5] w-full rounded-rasa bg-plum-d object-cover"
                style={{ objectPosition: "50% 30%" }}
              />
            ))}
          </div>
        ) : !hasLivePhotos && (local?.img.length ?? 0) > 1 ? (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
            {local!.img.slice(1).map((k, i) => (
              <RasaImage
                key={k}
                img={k}
                alt={`${a.altn || a.n}, photo ${i + 2}`}
                className={
                  k === "Art of Drumming-01"
                    ? "h-auto aspect-[16/9]!"
                    : `!aspect-[4/5] ${isWide(a, k) ? "!aspect-[3/2]" : ""}`
                }
                style={
                  k === "Art of Drumming-01"
                    ? { aspectRatio: "16 / 9", objectPosition: "50% 45%" }
                    : { objectPosition: "50% 30%" }
                }
                width={500}
                height={k === "Art of Drumming-01" ? 281 : 625}
              />
            ))}
          </div>
        ) : null}
        <p className="mt-3.5 text-[0.9rem] text-muted">
          <Link href="/artists" className={lnk}>
            All artists
          </Link>
        </p>
      </div>
    </>
  );
}

function ArtistHero({ name, role }: { name: string; role: string }) {
  return (
    <>
      <div className={`${lab} text-[#f2c9d0]`}>
        <Link href="/artists" className="no-underline">
          ← All artists
        </Link>
      </div>
      <h1 className="font-display text-[clamp(2rem,5vw,3.2rem)] font-semibold text-white">{name}</h1>
      <p className="mt-2.5 max-w-[720px] text-[1.05rem] text-[#eadcee]">{role}</p>
    </>
  );
}

function PhotoPlaceholder() {
  return (
    <div className="grid aspect-[4/5] place-items-center rounded-rasa border-2 border-dashed border-[#c9b0cd] bg-[repeating-linear-gradient(45deg,#faf6fb,#faf6fb_10px,#f2e8f3_10px,#f2e8f3_20px)] p-3 text-center text-[0.85rem] text-[#7d5f82]">
      Photo to come
    </div>
  );
}

function isWide(a: NonNullable<ReturnType<typeof byArtistId>>, k: string) {
  const skip = ["lourd-5", "lourd-bw", "lourd-cert", "mal-9", "mal-5", "mal-7"];
  if (a.land && !skip.includes(k)) return true;
  return WIDE_IMGS.has(k);
}