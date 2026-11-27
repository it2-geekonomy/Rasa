import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CheckinStatus, Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { CheckInDto, ListCheckinsQueryDto, ListTicketsQueryDto } from './dto/ticket.dto';

type Tx = Prisma.TransactionClient;
type AttendeeRecord = {
  name?: string;
  email?: string;
  phone?: string;
  eventSeatId?: string;
};

const ticketInclude = {
  booking: {
    select: {
      id: true,
      bookingReference: true,
      bookingStatus: true,
      customerName: true,
    },
  },
  session: {
    select: {
      id: true,
      sessionName: true,
      startAt: true,
      endAt: true,
      event: { select: { id: true, title: true } },
      venue: { select: { id: true, name: true } },
    },
  },
  bookingSeat: {
    select: {
      id: true,
      eventSeat: {
        select: {
          seat: {
            select: { seatLabel: true, rowLabel: true, seatNumber: true, seatType: true },
          },
        },
      },
    },
  },
} satisfies Prisma.BookingTicketInclude;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(tx: Tx, bookingId: string) {
    const existing = await tx.bookingTicket.count({ where: { bookingId } });
    if (existing > 0) {
      return;
    }
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSeats: { select: { id: true, eventSeatId: true } },
      },
    });
    if (!booking || booking.bookingStatus !== 'CONFIRMED') {
      return;
    }
    const attendees = readAttendees(booking.attendees);
    const lines =
      booking.bookingSeats.length > 0
        ? booking.bookingSeats.map((seat) => ({
            bookingSeatId: seat.id,
            attendee:
              attendees.find((person) => person.eventSeatId === seat.eventSeatId) ??
              attendees[booking.bookingSeats.indexOf(seat)],
          }))
        : Array.from({ length: booking.quantity }, (_, index) => ({
            bookingSeatId: null as string | null,
            attendee: attendees[index],
          }));

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const person = line.attendee;
      await this.createTicket(tx, {
        bookingId: booking.id,
        eventSessionId: booking.eventSessionId,
        bookingSeatId: line.bookingSeatId,
        ticketNumber: `${booking.bookingReference}-${String(index + 1).padStart(2, '0')}`,
        attendeeName: requiredClip(person?.name?.trim() || booking.customerName, 150),
        attendeeEmail: clip(person?.email?.trim().toLowerCase() || booking.customerEmail, 255),
        attendeePhone: clipPhone(person?.phone || booking.customerPhone),
      });
    }
  }

  async findAll(query: ListTicketsQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const where: Prisma.BookingTicketWhereInput = {
      ...(query.eventSessionId ? { eventSessionId: query.eventSessionId } : {}),
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search, mode: 'insensitive' } },
              { attendeeName: { contains: search, mode: 'insensitive' } },
              { attendeeEmail: { contains: search, mode: 'insensitive' } },
              { booking: { bookingReference: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.bookingTicket.findMany({
        where,
        skip,
        take,
        orderBy: { issuedAt: 'desc' },
        include: ticketInclude,
      }),
      this.prisma.bookingTicket.count({ where }),
    ]);
    return { data, meta: pageMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.bookingTicket.findUnique({
      where: { id },
      include: ticketInclude,
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async validate(qrToken: string, eventSessionId?: string) {
    const ticket = await this.findByToken(qrToken);
    const reason = this.rejectionReason(ticket, eventSessionId);
    return {
      valid: reason === null,
      reason,
      ticket,
    };
  }

  async checkIn(dto: CheckInDto, adminId: string) {
    const ticket = await this.findByToken(dto.qrToken);
    const reason = this.rejectionReason(ticket, dto.eventSessionId);
    if (reason) {
      await this.recordRejection(ticket.id, adminId, reason);
      throw new ConflictException(reason);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.bookingTicket.updateMany({
          where: { id: ticket.id, status: TicketStatus.ACTIVE },
          data: { status: TicketStatus.USED },
        });
        if (updated.count !== 1) {
          throw new ConflictException('This ticket is already checked in');
        }
        const checkin = await tx.ticketCheckin.create({
          data: {
            bookingTicketId: ticket.id,
            scannedBy: adminId,
            checkinStatus: CheckinStatus.SUCCESS,
          },
        });
        return {
          checkin,
          ticket: await tx.bookingTicket.findUniqueOrThrow({
            where: { id: ticket.id },
            include: ticketInclude,
          }),
        };
      });
    } catch (error) {
      if (this.isAlreadyCheckedIn(error)) {
        await this.recordRejection(ticket.id, adminId, 'This ticket is already checked in');
        throw new ConflictException('This ticket is already checked in');
      }
      throw error;
    }
  }

  async findCheckins(query: ListCheckinsQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.TicketCheckinWhereInput = {
      ...(query.bookingTicketId ? { bookingTicketId: query.bookingTicketId } : {}),
      ...(query.checkinStatus ? { checkinStatus: query.checkinStatus } : {}),
      ...(query.eventSessionId
        ? { ticket: { eventSessionId: query.eventSessionId } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.ticketCheckin.findMany({
        where,
        skip,
        take,
        orderBy: { checkedInAt: 'desc' },
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              attendeeName: true,
              status: true,
              eventSessionId: true,
            },
          },
        },
      }),
      this.prisma.ticketCheckin.count({ where }),
    ]);
    return { data, meta: pageMeta(total, page, limit) };
  }

  private async findByToken(qrToken: string) {
    const ticket = await this.prisma.bookingTicket.findUnique({
      where: { qrToken },
      include: ticketInclude,
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  private rejectionReason(
    ticket: {
      status: TicketStatus;
      eventSessionId: string;
      booking: { bookingStatus: string };
    },
    eventSessionId?: string,
  ) {
    if (eventSessionId && ticket.eventSessionId !== eventSessionId) {
      return 'This ticket is for a different session';
    }
    if (ticket.status === TicketStatus.USED) {
      return 'This ticket is already checked in';
    }
    if (ticket.status !== TicketStatus.ACTIVE) {
      return 'This ticket is not active';
    }
    if (ticket.booking.bookingStatus !== 'CONFIRMED') {
      return 'This booking is not confirmed';
    }
    return null;
  }

  private async recordRejection(ticketId: string, adminId: string, notes: string) {
    await this.prisma.ticketCheckin.create({
      data: {
        bookingTicketId: ticketId,
        scannedBy: adminId,
        checkinStatus: CheckinStatus.REJECTED,
        notes,
      },
    });
  }

  private isAlreadyCheckedIn(error: unknown) {
    if (error instanceof ConflictException) {
      return true;
    }
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );
  }

  private async createTicket(
    tx: Tx,
    input: {
      bookingId: string;
      eventSessionId: string;
      bookingSeatId: string | null;
      ticketNumber: string;
      attendeeName: string;
      attendeeEmail: string | null;
      attendeePhone: string | null;
    },
  ) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await tx.bookingTicket.create({
          data: {
            ...input,
            ticketNumber: attempt === 0 ? input.ticketNumber : `${input.ticketNumber}-${randomBytes(2).toString('hex').toUpperCase()}`,
            qrToken: randomBytes(32).toString('hex'),
          },
        });
        return;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 4
        ) {
          continue;
        }
        throw error;
      }
    }
  }
}

function readAttendees(value: Prisma.JsonValue | null): AttendeeRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }
    const record = item as Record<string, unknown>;
    return [
      {
        name: typeof record.name === 'string' ? record.name : undefined,
        email: typeof record.email === 'string' ? record.email : undefined,
        phone: typeof record.phone === 'string' ? record.phone : undefined,
        eventSeatId: typeof record.eventSeatId === 'string' ? record.eventSeatId : undefined,
      },
    ];
  });
}

function requiredClip(value: string, max: number) {
  return (value.trim() || 'Guest').slice(0, max);
}

function clip(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function clipPhone(value: string) {
  const compact = value.replace(/\s+/g, '').slice(0, 20);
  return compact || null;
}
