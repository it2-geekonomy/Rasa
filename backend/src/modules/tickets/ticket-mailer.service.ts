import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import QRCode = require('qrcode');
import { PrismaService } from '../../common/prisma/prisma.service';

const passInclude = {
  tickets: {
    orderBy: { ticketNumber: 'asc' as const },
    include: {
      session: {
        select: {
          startAt: true,
          endAt: true,
          event: { select: { title: true } },
          venue: { select: { name: true } },
        },
      },
      bookingSeat: {
        include: {
          eventSeat: {
            include: { seat: { select: { seatLabel: true } } },
          },
        },
      },
    },
  },
  session: {
    select: {
      id: true,
      sessionName: true,
      startAt: true,
      endAt: true,
      capacity: true,
      event: { select: { title: true, slug: true } },
      venue: { select: { name: true } },
    },
  },
} satisfies Prisma.BookingInclude;

type PassBooking = Prisma.BookingGetPayload<{ include: typeof passInclude }>;

const when = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

@Injectable()
export class TicketMailer {
  private readonly logger = new Logger(TicketMailer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async deliver(bookingId: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: passInclude,
      });
      if (!booking || booking.bookingStatus !== 'CONFIRMED' || booking.tickets.length === 0) {
        return;
      }
      const apiKey = (this.config.get<string>('resend.apiKey') ?? '').trim();
      const from = (this.config.get<string>('resend.from') ?? '').trim();
      const siteUrl = (this.config.get<string>('siteUrl') ?? 'http://localhost:3000').trim();
      if (!apiKey || !from) {
        this.logger.warn(`Ticket email skipped for ${booking.bookingReference}: Resend is not configured`);
        return;
      }
      await sendTicketEmail(booking, { apiKey, from, siteUrl });
      this.logger.log(`Ticket email sent for ${booking.bookingReference}`);
      await this.notifySoldOutIfNeeded(booking, { apiKey, from });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Ticket email failed for booking ${bookingId}: ${message}`);
    }
  }

  private async notifySoldOutIfNeeded(
    booking: PassBooking,
    options: { apiKey: string; from: string },
  ) {
    const capacity = booking.session.capacity;
    if (booking.session.event.slug !== 'carving-rhythm-linocut' || capacity == null) {
      return;
    }
    const agg = await this.prisma.booking.aggregate({
      where: { eventSessionId: booking.eventSessionId, bookingStatus: 'CONFIRMED' },
      _sum: { quantity: true },
    });
    const confirmed = agg._sum.quantity ?? 0;
    if (confirmed < capacity || confirmed - booking.quantity >= capacity) {
      return;
    }
    const notifyTo = 'sachin@thegeekonomy.com';
    const slot = `${when.format(booking.session.startAt)} – ${when.format(booking.session.endAt)}`;
    const html = `
      <div style="font-family:Georgia,serif;color:#241426;max-width:560px;margin:0 auto;padding:24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#931929;">RASA Festival · Sold Out Alert</p>
        <h1 style="margin:0 0 12px;font-size:22px;color:#3f1441;">${escapeHtml(booking.session.event.title)}</h1>
        <p style="margin:0 0 12px;font-size:15px;">All <strong>${confirmed} of ${capacity}</strong> slots are now filled.</p>
        <p style="margin:0 0 6px;font-size:14px;color:#5b1f5d;">Venue: ${escapeHtml(booking.session.venue.name)}</p>
        <p style="margin:0 0 6px;font-size:14px;color:#5b1f5d;">Time: ${escapeHtml(slot)}</p>
        <p style="margin:0;font-size:14px;color:#5b1f5d;">Last booking: ${escapeHtml(booking.bookingReference)} (${escapeHtml(booking.customerName)})</p>
      </div>
    `;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `RASA Festival <${options.from}>`,
        to: [notifyTo],
        subject: `Slots filled (${confirmed}/${capacity}): ${booking.session.event.title}`,
        html,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Sold-out alert email failed (${response.status}): ${body}`);
      return;
    }
    this.logger.log(`Sold-out alert email sent for ${booking.session.event.slug} (${confirmed}/${capacity})`);
  }
}

export function qrPayload(token: string, siteUrl?: string) {
  const base = (siteUrl ?? process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/ticket/${token}`;
}

export async function qrDataUrl(token: string, siteUrl?: string) {
  return QRCode.toDataURL(qrPayload(token, siteUrl), { width: 360, margin: 1, errorCorrectionLevel: 'M' });
}

async function sendTicketEmail(
  booking: PassBooking,
  options: { apiKey: string; from: string; siteUrl: string },
) {
  const images = await Promise.all(
    booking.tickets.map(async (ticket) => ({
      ticket,
      png: await QRCode.toBuffer(qrPayload(ticket.qrToken, options.siteUrl), {
        type: 'png',
        width: 480,
        margin: 1,
        errorCorrectionLevel: 'M',
      }),
    })),
  );
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `RASA Festival <${options.from}>`,
      to: [booking.customerEmail],
      subject: `Your RASA ticket ${booking.bookingReference}`,
      html: emailHtml(booking, images.map((item) => item.ticket.ticketNumber)),
      attachments: images.map((item) => ({
        filename: `${item.ticket.ticketNumber}.png`,
        content: item.png.toString('base64'),
        content_type: 'image/png',
        content_id: item.ticket.ticketNumber,
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function emailHtml(booking: PassBooking, ticketNumbers: string[]) {
  const mainShow = escapeHtml(booking.session.event.title);
  const mainVenue = escapeHtml(booking.session.venue.name);
  const mainSlot = `${when.format(booking.session.startAt)} – ${when.format(booking.session.endAt)}`;
  const total = booking.tickets.length;

  const cards = booking.tickets
    .map((ticket, index) => {
      const seat = ticket.bookingSeat?.eventSeat.seat.seatLabel;
      const showTitle = escapeHtml(ticket.session?.event.title ?? booking.session.event.title);
      const venueName = escapeHtml(booking.session.venue.name);
      const slotText = ticket.session
        ? `${when.format(ticket.session.startAt)} – ${when.format(ticket.session.endAt)}`
        : mainSlot;
      const ticketNo = escapeHtml(ticket.ticketNumber);
      const attendee = escapeHtml(ticket.attendeeName);
      const seatLabel = seat ? `Seat ${escapeHtml(seat)}` : 'Open entry';

      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:separate;border-spacing:0;border:1px solid #d9c7dc;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 4px 14px rgba(63,20,65,0.08);">
          <tr>
            <td colspan="2" style="background:#3f1441;background-image:linear-gradient(90deg,#3f1441 0%,#5b1f5d 55%,#7a1728 100%);padding:14px 20px;color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">RASA</span>
                    <span style="display:inline-block;margin-left:8px;padding:3px 10px;border:1px solid rgba(255,215,122,0.5);border-radius:999px;background:rgba(255,255,255,0.1);font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ffd77a;vertical-align:middle;">Official Pass</span>
                  </td>
                  <td style="text-align:right;vertical-align:middle;">
                    <div style="font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.75);">Ticket ${index + 1} of ${total}</div>
                    <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;margin-top:2px;">${ticketNo}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="height:4px;background:#d9a441;background-image:linear-gradient(90deg,#d9a441,#ffd77a,#d9a441);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:18px 20px;vertical-align:top;">
              <div style="font-family:Georgia,serif;font-size:19px;font-weight:700;line-height:1.3;color:#3f1441;margin:0 0 10px;">${showTitle}</div>
              <div style="font-size:13px;color:#5b1f5d;margin:0 0 4px;"><strong>${escapeHtml(slotText)}</strong></div>
              <div style="font-size:13px;color:#6c5970;margin:0 0 14px;">${venueName} · PCPA, Bengaluru</div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:0 16px 0 0;vertical-align:top;">
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8f2536;">Seat</div>
                    <div style="font-size:15px;font-weight:700;color:#3f1441;margin-top:2px;">${seatLabel}</div>
                  </td>
                  <td style="padding:0;vertical-align:top;">
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8f2536;">Attendee</div>
                    <div style="font-size:14px;font-weight:600;color:#241426;margin-top:2px;">${attendee}</div>
                  </td>
                </tr>
              </table>
              <div style="margin-top:12px;font-size:11px;color:#7a6880;">Ref: <strong style="color:#3f1441;">${escapeHtml(booking.bookingReference)}</strong></div>
            </td>
            <td width="168" style="padding:16px 18px;border-left:2px dashed #e4d5e6;background:#fbf7fc;text-align:center;vertical-align:middle;">
              <img src="cid:${ticketNo}" alt="QR ticket ${ticketNo}" width="136" height="136" style="display:block;margin:0 auto;border-radius:8px;background:#ffffff;padding:6px;border:1px solid #e4d5e6;" />
              <div style="margin-top:8px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#5b1f5d;">Scan at entry</div>
            </td>
          </tr>
        </table>`;
    })
    .join('');

  return `
    <div style="margin:0;padding:24px 12px;background:#f7f2f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#241426;">
      <div style="max-width:600px;margin:0 auto;">
        <div style="margin:0 0 18px;padding:16px 20px;border-radius:14px;border:1px solid #bbf7d0;background:#ecfdf5;">
          <span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#059669;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Confirmed</span>
          <span style="margin-left:8px;font-size:13px;font-weight:700;letter-spacing:0.06em;color:#3f1441;">${escapeHtml(booking.bookingReference)}</span>
          <p style="margin:8px 0 0;font-size:14px;color:#241426;">
            Hello <strong>${escapeHtml(booking.customerName)}</strong>, your ${ticketNumbers.length} RASA Festival ${ticketNumbers.length === 1 ? 'pass is' : 'passes are'} ready for <strong>${mainShow}</strong> (${mainVenue} · ${escapeHtml(mainSlot)}). Show the QR code below at the venue entry.
          </p>
        </div>
        ${cards}
        <p style="margin:12px 0 0;text-align:center;font-size:12px;color:#7a6880;">
          RASA Festival · January 2027 · Prestige Centre for Performing Arts, Bengaluru
        </p>
      </div>
    </div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
