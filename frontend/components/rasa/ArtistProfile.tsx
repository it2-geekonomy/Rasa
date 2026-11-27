import Link from "next/link";
import { ARTISTS, EV, DAYS, dayOf, byArtistId } from "@/lib/rasa/catalog";
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

export function ArtistProfile({ id }: Props) {
  const a = byArtistId(id) ?? ARTISTS[0];
  const evs = (a.ev || [])
    .map((eid) => EV.find((e) => e.id === eid))
    .filter(Boolean)
    .sort(
      (x, y) =>
        DAYS.findIndex((d) => d.id === x!.d) - DAYS.findIndex((d) => d.id === y!.d) || x!.s - y!.s,
    );

  return (
    <>
      <div className="bg-plum text-white py-11 max-md:py-7">
        <div className="mx-auto max-w-[1240px] px-6 max-md:px-4">
          <ArtistHero name={a.n} role={a.r} />
        </div>
      </div>
      <div className={wrapTight}>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" id="a-cols">
          <div>
            {a.bio.map((p) => (
              <p key={p.slice(0, 40)} className="mb-3 text-[1.05rem] text-muted">
                {p}
              </p>
            ))}
            {a.ct ? <ContactRow contact={a.ct} /> : null}
            {a.logo ? (
              <a
                href={a.logo.href}
                target="_blank"
                rel="noopener noreferrer"
                className="my-3.5 inline-flex min-h-24 min-w-[min(240px,100%)] items-center justify-center rounded-rasa bg-white px-5 py-3"
                aria-label={`${a.logo.alt} (opens in a new tab)`}
              >
                <RasaImage img={a.logo.img} alt={a.logo.alt} width={600} height={260} className="!h-[72px] !w-auto !rounded-none" />
              </a>
            ) : null}
            {a.cred ? (
              <p className="text-[0.9rem] text-muted" dangerouslySetInnerHTML={{ __html: a.cred }} />
            ) : null}
            <h3 className="mt-7 font-display text-xl font-semibold text-plum">At RASA</h3>
            <div className="my-4 grid gap-2">
              {evs.map((e) => (
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
          </div>
          <div>
            {a.img.length ? (
              <RasaImage
                img={a.img[0]}
                alt={a.altn || a.n}
                className="!aspect-[4/5]"
                style={{ objectPosition: a.pos || "50% 30%" }}
                width={600}
                height={750}
              />
            ) : (
              <PhotoPlaceholder />
            )}
          </div>
        </div>
        {a.img.length > 1 ? (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
            {a.img.slice(1).map((k, i) => (
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