"use client";

import { btn, btnLine } from "@/lib/rasa/ui";
import { RasaImage } from "@/components/rasa/RasaImage";

export type PassTicket = {
  ticketNumber: string;
  attendeeName: string;
  seatLabel: string | null;
  showTitle?: string | null;
  qrDataUrl: string | null;
};

export type PassBooking = {
  id: string;
  bookingReference: string;
  bookingStatus: string;
  customerEmail: string;
  session: {
    startAt: string;
    endAt: string;
    event: { title: string };
    venue: { name: string };
  };
  tickets: PassTicket[];
};

const when = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

type Props = {
  pass?: PassBooking;
  passes?: PassBooking[];
  onBookAnother: () => void;
};

export function TicketPasses({ pass, passes, onBookAnother }: Props) {
  const list = passes?.length ? passes : pass ? [pass] : [];
  if (!list.length) return null;

  const primary = list[0];
  const allEntries = list.flatMap((p) => {
    const slot = `${when.format(new Date(p.session.startAt))} – ${when.format(new Date(p.session.endAt))}`;
    return p.tickets.map((ticket) => ({ pass: p, ticket, slot }));
  });
  const downloadable = allEntries.filter((e) => Boolean(e.ticket.qrDataUrl));

  async function downloadAll() {
    for (const entry of downloadable) {
      await downloadTicket(entry.pass, entry.ticket, entry.slot);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-[0.7rem] font-bold text-white">
              Confirmed
            </span>
            <span className="font-lab text-xs font-bold tracking-wider text-plum">
              {list.map((p) => p.bookingReference).join(" · ")}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {allEntries.length} QR ticket{allEntries.length === 1 ? "" : "s"} sent to{" "}
            <span className="font-semibold text-plum">{primary.customerEmail}</span>
          </p>
        </div>
        {downloadable.length > 1 ? (
          <button type="button" className={`${btn} !min-h-9 !px-4 !py-1.5 !text-xs`} onClick={downloadAll}>
            Download all ({downloadable.length})
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        {allEntries.map(({ pass: p, ticket, slot }, index) => (
          <article
            key={ticket.ticketNumber}
            className="overflow-hidden rounded-2xl border border-plum/20 bg-white shadow-md"
          >
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#3f1441] via-plum to-[#7a1728] px-4 py-2.5 text-white sm:px-5 sm:py-3">
              <div className="flex items-center gap-2.5">
                <RasaImage
                  img="logo-white"
                  alt="RASA Festival"
                  width={180}
                  height={90}
                  className="!h-7 !w-auto shrink-0 sm:!h-8"
                />
                <span className="hidden rounded-full border border-[#ffd77a]/40 bg-white/10 px-2.5 py-0.5 font-lab text-[0.65rem] font-bold tracking-[0.22em] text-[#ffd77a] uppercase sm:inline-block">
                  Official Pass
                </span>
              </div>
              <div className="text-right">
                <p className="font-lab text-[0.6rem] font-semibold tracking-[0.18em] text-white/75 uppercase">
                  Ticket {index + 1} of {allEntries.length}
                </p>
                <p className="font-lab text-xs font-bold tracking-wider text-white">
                  {ticket.ticketNumber}
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-[#d9a441] via-[#ffd77a] to-[#d9a441]" />

            <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col justify-between gap-3 p-4 sm:p-5">
                <div>
                  <h3 className="font-display text-lg font-bold leading-snug text-plum sm:text-xl">
                    {ticket.showTitle || p.session.event.title}
                  </h3>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                    <div>
                      <span className="block font-lab text-[0.62rem] font-bold tracking-wider uppercase text-muted/80">
                        Venue
                      </span>
                      <span className="font-medium text-ink">{p.session.venue.name}</span>
                    </div>
                    <div>
                      <span className="block font-lab text-[0.62rem] font-bold tracking-wider uppercase text-muted/80">
                        Date &amp; Time
                      </span>
                      <span className="font-medium text-ink">{slot}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-burg/25 bg-tint px-3 py-1.5">
                      <span className="font-lab text-[0.68rem] font-bold uppercase tracking-wider text-muted">
                        {ticket.seatLabel ? "Seat" : "Pass"}
                      </span>
                      <span className="font-display text-base font-bold text-burg sm:text-lg">
                        {ticket.seatLabel || ticket.attendeeName}
                      </span>
                    </div>
                    {ticket.seatLabel && ticket.attendeeName ? (
                      <div className="text-xs text-muted">
                        <span className="block font-lab text-[0.62rem] font-bold uppercase tracking-wider">
                          Guest
                        </span>
                        <span className="font-semibold text-plum">{ticket.attendeeName}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="hidden sm:block">
                  <button
                    type="button"
                    className={btnLine}
                    disabled={!ticket.qrDataUrl}
                    onClick={() => downloadTicket(p, ticket, slot)}
                  >
                    Download ticket PNG
                  </button>
                </div>
              </div>

              <div className="relative flex flex-row items-center justify-between gap-3 border-t-2 border-dashed border-plum/20 bg-gradient-to-b from-tint/40 to-tint/70 px-4 py-3 sm:flex-col sm:justify-center sm:border-t-0 sm:border-l-2 sm:px-7 sm:py-5">
                <span
                  aria-hidden
                  className="hidden sm:block absolute -left-3 -top-3 size-6 rounded-full border border-plum/15 bg-white"
                />
                <span
                  aria-hidden
                  className="hidden sm:block absolute -left-3 -bottom-3 size-6 rounded-full border border-plum/15 bg-white"
                />
                {ticket.qrDataUrl ? (
                  <div className="rounded-xl border-2 border-plum/15 bg-white p-1.5 shadow-sm sm:p-2.5">
                    <img src={ticket.qrDataUrl} alt={`QR ticket ${ticket.ticketNumber}`} className="h-24 w-24 sm:h-36 sm:w-36" />
                  </div>
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-line text-xs text-muted sm:h-36 sm:w-36">
                    QR pending
                  </div>
                )}
                <div className="flex flex-col items-end gap-2 sm:items-center">
                  <p className="font-lab text-[0.68rem] font-bold uppercase tracking-[0.18em] text-plum">
                    Scan at entry
                  </p>
                  <button
                    type="button"
                    className={`${btnLine} !min-h-9 !px-3.5 !py-1.5 !text-xs sm:hidden`}
                    disabled={!ticket.qrDataUrl}
                    onClick={() => downloadTicket(p, ticket, slot)}
                  >
                    Download PNG
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex justify-end pb-2">
        <button type="button" className={btnLine} onClick={onBookAnother}>
          Book another show
        </button>
      </div>
    </div>
  );
}

async function downloadTicket(pass: PassBooking, ticket: PassTicket, slot: string) {
  if (!ticket.qrDataUrl) return;
  const qrImg = new Image();
  qrImg.src = ticket.qrDataUrl;
  await qrImg.decode();

  const logoImg = new Image();
  logoImg.src = "/images/logo-white.png";
  await logoImg.decode().catch(() => null);

  const canvas = document.createElement("canvas");
  canvas.width = 860;
  canvas.height = 1160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Outer backdrop
  ctx.fillStyle = "#f6f0f6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ticket card shadow & body
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 32, 32, 796, 1096, 28);
  ctx.fill();
  ctx.strokeStyle = "#e3d5e4";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header band
  ctx.save();
  roundRect(ctx, 32, 32, 796, 170, { tl: 28, tr: 28, br: 0, bl: 0 });
  ctx.clip();
  const grad = ctx.createLinearGradient(32, 32, 828, 202);
  grad.addColorStop(0, "#3f1441");
  grad.addColorStop(0.6, "#5b1f5d");
  grad.addColorStop(1, "#7a1728");
  ctx.fillStyle = grad;
  ctx.fillRect(32, 32, 796, 170);
  ctx.restore();

  // Gold accent strip
  ctx.fillStyle = "#e2b24e";
  ctx.fillRect(32, 202, 796, 6);

  // Logo + header labels
  if (logoImg.naturalWidth > 0) {
    ctx.drawImage(logoImg, 68, 66, 200, 100);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 32px Georgia, serif";
    ctx.fillText("RASA FESTIVAL", 68, 128);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd77a";
  ctx.font = "700 18px sans-serif";
  ctx.fillText("OFFICIAL ENTRY PASS", 792, 98);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 26px sans-serif";
  ctx.fillText(ticket.ticketNumber, 792, 138);
  ctx.font = "500 18px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(pass.bookingReference, 792, 168);
  ctx.textAlign = "left";

  // Show title
  ctx.fillStyle = "#241426";
  ctx.font = "700 38px Georgia, serif";
  const nextY = wrapText(ctx, ticket.showTitle || pass.session.event.title, 68, 276, 724, 48);

  // Venue & schedule
  ctx.fillStyle = "#665869";
  ctx.font = "700 16px sans-serif";
  ctx.fillText("VENUE", 68, nextY + 24);
  ctx.fillText("DATE & TIME", 440, nextY + 24);
  ctx.fillStyle = "#241426";
  ctx.font = "600 22px sans-serif";
  wrapText(ctx, pass.session.venue.name, 68, nextY + 54, 340, 28);
  wrapText(ctx, slot, 440, nextY + 54, 352, 28);

  // Seat / Guest box
  const boxY = nextY + 114;
  ctx.fillStyle = "#f6f0f6";
  roundRect(ctx, 68, boxY, 724, 96, 16);
  ctx.fill();
  ctx.strokeStyle = "#e3d5e4";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#665869";
  ctx.font = "700 15px sans-serif";
  ctx.fillText(ticket.seatLabel ? "SEAT" : "PASS HOLDER", 96, boxY + 34);
  ctx.fillStyle = "#931929";
  ctx.font = "700 34px Georgia, serif";
  ctx.fillText(ticket.seatLabel || ticket.attendeeName, 96, boxY + 74);

  if (ticket.seatLabel && ticket.attendeeName) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#665869";
    ctx.font = "700 15px sans-serif";
    ctx.fillText("GUEST", 764, boxY + 34);
    ctx.fillStyle = "#5b1f5d";
    ctx.font = "600 24px sans-serif";
    ctx.fillText(ticket.attendeeName, 764, boxY + 72);
    ctx.textAlign = "left";
  }

  // Perforated tear line with side notches
  const tearY = 670;
  ctx.save();
  ctx.strokeStyle = "#cdb9cf";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(56, tearY);
  ctx.lineTo(804, tearY);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#f6f0f6";
  ctx.beginPath();
  ctx.arc(32, tearY, 20, 0, Math.PI * 2);
  ctx.arc(828, tearY, 20, 0, Math.PI * 2);
  ctx.fill();

  // QR Frame
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 255, 710, 350, 350, 20);
  ctx.fill();
  ctx.strokeStyle = "#e3d5e4";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.drawImage(qrImg, 275, 730, 310, 310);

  ctx.textAlign = "center";
  ctx.fillStyle = "#5b1f5d";
  ctx.font = "700 18px sans-serif";
  ctx.fillText("SCAN THIS QR CODE AT AUDITORIUM ENTRY", 430, 1096);
  ctx.textAlign = "left";

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${ticket.ticketNumber}.png`;
  link.click();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl: number; tr: number; br: number; bl: number },
) {
  const rad = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + rad.tl, y);
  ctx.lineTo(x + w - rad.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad.tr);
  ctx.lineTo(x + w, y + h - rad.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad.br, y + h);
  ctx.lineTo(x + rad.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad.bl);
  ctx.lineTo(x, y + rad.tl);
  ctx.quadraticCurveTo(x, y, x + rad.tl, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursor);
    cursor += lineHeight;
  }
  return cursor;
}
