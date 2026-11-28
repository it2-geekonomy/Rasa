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
  const show = escapeHtml(booking.session.event.title);
  const venue = escapeHtml(booking.session.venue.name);
  const slot = `${when.format(booking.session.startAt)} – ${when.format(booking.session.endAt)}`;
  const cards = booking.tickets
    .map((ticket) => {
      const seat = ticket.bookingSeat?.eventSeat.seat.seatLabel;
      const show = ticket.session?.event.title;
      const slot = ticket.session
        ? `${when.format(ticket.session.startAt)} – ${when.format(ticket.session.endAt)}`
        : '';
      return `
        <div style="border:1px solid #e4d5e6;border-radius:16px;padding:16px;margin:0 0 16px;">
          <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#931929;">${escapeHtml(ticket.ticketNumber)}</p>
          ${show ? `<p style="margin:0 0 4px;font-size:16px;color:#3f1441;">${escapeHtml(show)}</p>` : ''}
          ${slot ? `<p style="margin:0 0 8px;font-size:13px;color:#5b1f5d;">${escapeHtml(slot)}</p>` : ''}
          <p style="margin:0 0 12px;font-size:18px;color:#3f1441;">${seat ? `Seat ${escapeHtml(seat)}` : escapeHtml(ticket.attendeeName)}</p>
          <img src="cid:${escapeHtml(ticket.ticketNumber)}" alt="QR ticket" width="220" height="220" />
        </div>`;
    })
    .join('');
  return `
    <div style="font-family:Arial,sans-serif;color:#241426;max-width:560px;">
      <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#931929;">RASA Festival</p>
      <h1 style="font-size:24px;color:#3f1441;">Your tickets are ready</h1>
      <p>Hello ${escapeHtml(booking.customerName)},</p>
      <p><strong>${show}</strong><br>${escapeHtml(venue)}<br>${escapeHtml(slot)}</p>
      <p>Booking reference <strong>${escapeHtml(booking.bookingReference)}</strong>. Show the QR code at the auditorium. ${ticketNumbers.length} ticket${ticketNumbers.length === 1 ? '' : 's'} ${ticketNumbers.length === 1 ? 'is' : 'are'} attached.</p>
      ${cards}
    </div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
