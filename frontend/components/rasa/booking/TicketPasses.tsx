"use client";

import { btn, btnLine, card, lab } from "@/lib/rasa/ui";

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
  pass: PassBooking;
  onBookAnother: () => void;
};

export function TicketPasses({ pass, onBookAnother }: Props) {
  const slot = `${when.format(new Date(pass.session.startAt))} – ${when.format(new Date(pass.session.endAt))}`;

  return (
    <div className={`${card} mx-auto max-w-xl`}>
      <p className={`${lab} text-burg`}>Tickets ready</p>
      <h2 className="!mb-1">{pass.bookingReference}</h2>
      <p className="font-semibold text-plum">{pass.session.event.title}</p>
      <p>
        {pass.session.venue.name}
        <br />
        {slot}
      </p>
      <p className="mt-2">The QR tickets were sent to {pass.customerEmail}. You can also download them here.</p>
      <div className="mt-4 space-y-4">
        {pass.tickets.map((ticket) => (
          <article key={ticket.ticketNumber} className="rounded-rasa border border-line p-4">
            <p className={`${lab} text-burg`}>{ticket.ticketNumber}</p>
            {ticket.showTitle ? <p className="mt-1 font-semibold text-plum">{ticket.showTitle}</p> : null}
            <p className="mt-1 font-semibold text-plum">{ticket.seatLabel ? `Seat ${ticket.seatLabel}` : ticket.attendeeName}</p>
            {ticket.qrDataUrl ? (
              <img src={ticket.qrDataUrl} alt={`QR ticket ${ticket.ticketNumber}`} className="mt-3 h-44 w-44" />
            ) : null}
            <button
              type="button"
              className={`${btn} mt-3`}
              disabled={!ticket.qrDataUrl}
              onClick={() => downloadTicket(pass, ticket, slot)}
            >
              Download ticket
            </button>
          </article>
        ))}
      </div>
      <button type="button" className={`${btnLine} mt-4`} onClick={onBookAnother}>
        Book another show
      </button>
    </div>
  );
}

async function downloadTicket(pass: PassBooking, ticket: PassTicket, slot: string) {
  if (!ticket.qrDataUrl) return;
  const image = new Image();
  image.src = ticket.qrDataUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#f6f0f6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#3f1441";
  ctx.fillRect(0, 0, canvas.width, 150);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 28px sans-serif";
  ctx.fillText("RASA FESTIVAL", 48, 64);
  ctx.font = "600 22px sans-serif";
  ctx.fillText(pass.bookingReference, 48, 108);
  ctx.fillStyle = "#241426";
  ctx.font = "700 36px sans-serif";
  wrapText(ctx, ticket.showTitle || pass.session.event.title, 48, 220, 704, 44);
  ctx.font = "500 24px sans-serif";
  ctx.fillStyle = "#5b1f5d";
  ctx.fillText(pass.session.venue.name, 48, 340);
  ctx.fillText(slot, 48, 380);
  ctx.fillStyle = "#931929";
  ctx.font = "700 32px sans-serif";
  ctx.fillText(ticket.seatLabel ? `Seat ${ticket.seatLabel}` : ticket.attendeeName, 48, 450);
  ctx.fillText(ticket.ticketNumber, 48, 498);
  ctx.drawImage(image, 200, 540, 400, 400);
  ctx.fillStyle = "#241426";
  ctx.font = "500 20px sans-serif";
  ctx.fillText("Show this QR code at the auditorium.", 48, 1000);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${ticket.ticketNumber}.png`;
  link.click();
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
  if (line) ctx.fillText(line, x, cursor);
}
