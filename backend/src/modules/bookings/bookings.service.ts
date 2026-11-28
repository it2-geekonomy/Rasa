import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingMode, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { InventoryService } from '../sessions/inventory.service';
import { CreateBookingDto, CreateCartBookingDto } from './dto/booking.dto';
import { ListBookingsQueryDto } from '../payments/dto/payment.dto';
import { bookingInclude, PaymentsService } from '../payments/payments.service';
import { qrDataUrl, TicketMailer } from '../tickets/ticket-mailer.service';

type AttendeeRecord = {
  name: string;
  email?: string;
  phone?: string;
  eventSeatId?: string;
  seatLabel?: string;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentsService,
    private readonly mailer: TicketMailer,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateBookingDto) {
    const session = await this.prisma.eventSession.findUnique({
      where: { id: dto.eventSessionId },
      include: { event: { select: { bookingMode: true, title: true } } },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      await this.inventory.expireStaleReservations(tx, session.id);
      if (session.event.bookingMode === BookingMode.SEAT_BASED) {
        return this.createSeatBooking(tx, dto, session.price);
      }
      return this.createCapacityBooking(tx, dto, session);
    });

    if (new Prisma.Decimal(booking.totalAmount).isZero()) {
      void this.mailer.deliver(booking.id);
      return { booking, checkout: null };
    }
    const checkout = await this.payments.createCheckout(booking.id);
    const refreshed = await this.prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: bookingInclude,
    });
    return { booking: refreshed, checkout };
  }

  async createCart(dto: CreateCartBookingDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of dto.items) {
        const session = await tx.eventSession.findUnique({
          where: { id: item.eventSessionId },
          include: { event: { select: { id: true, status: true, bookingMode: true } } },
        });
        if (!session) {
          throw new NotFoundException('Session not found');
        }
        if (session.event.status !== 'PUBLISHED') {
          throw new BadRequestException('This event is not open for booking');
        }
        if (session.status === 'CANCELLED' || session.status === 'SOLD_OUT') {
          throw new ConflictException('This session is not available for booking');
        }
        const singleDto: CreateBookingDto = {
          eventSessionId: item.eventSessionId,
          holdToken: item.holdToken,
          quantity: item.quantity,
          attendees: item.attendees,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
        };
        const booking =
          session.event.bookingMode === BookingMode.SEAT_BASED
            ? await this.createSeatBooking(tx, singleDto, session.price)
            : await this.createCapacityBooking(tx, singleDto, session);
        results.push(booking);
      }
      return results;
    });

    const freeConfirmed = created.filter((b) => b.bookingStatus === 'CONFIRMED');
    for (const b of freeConfirmed) {
      void this.mailer.deliver(b.id);
    }

    const pendingPaid = created.filter((b) => b.bookingStatus !== 'CONFIRMED');
    if (pendingPaid.length === 0) {
      return { bookings: created, checkout: null };
    }

    const checkout = await this.payments.createCartCheckout(pendingPaid.map((b) => b.id));
    const refreshed = await this.prisma.booking.findMany({
      where: { id: { in: created.map((b) => b.id) } },
      include: bookingInclude,
      orderBy: { createdAt: 'asc' },
    });
    return { bookings: refreshed, checkout };
  }

  async retryCheckout(bookingId: string) {
    const checkout = await this.payments.createCheckout(bookingId);
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: bookingInclude,
    });
    return { booking, checkout };
  }

  async findAll(query: ListBookingsQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const search = query.search?.trim();
    const where: Prisma.BookingWhereInput = {
      ...(query.eventSessionId ? { eventSessionId: query.eventSessionId } : {}),
      ...(query.bookingStatus ? { bookingStatus: query.bookingStatus } : {}),
      ...(query.bookingMode ? { session: { event: { bookingMode: query.bookingMode } } } : {}),
      ...(query.email ? { customerEmail: query.email.toLowerCase() } : {}),
      ...(search
        ? {
            OR: [
              { bookingReference: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerEmail: { contains: search, mode: 'insensitive' } },
              { customerPhone: { contains: search } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: bookingInclude,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { data, meta: pageMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async lookup(reference: string, email: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { bookingReference: { equals: reference.trim(), mode: 'insensitive' } },
      select: { id: true, customerEmail: true },
    });
    if (!booking || booking.customerEmail !== email.toLowerCase()) {
      throw new NotFoundException('Booking not found');
    }
    return this.status(booking.id, email);
  }

  async status(id: string, email: string) {
    const booking = await this.findOne(id);
    if (booking.customerEmail !== email.toLowerCase()) {
      throw new NotFoundException('Booking not found');
    }
    const tickets = await Promise.all(
      booking.tickets.map(async (ticket) => {
        const { qrToken, ...rest } = ticket;
        return {
          ...rest,
          seatLabel: ticket.bookingSeat?.eventSeat.seat.seatLabel ?? null,
          showTitle: ticket.session?.event.title ?? null,
          qrDataUrl: qrToken ? await qrDataUrl(qrToken) : null,
        };
      }),
    );
    return { ...booking, tickets };
  }

  private async createSeatBooking(
    tx: Prisma.TransactionClient,
    dto: CreateBookingDto,
    _sessionPrice: Prisma.Decimal,
  ) {
    if (!dto.holdToken) {
      throw new BadRequestException('A seat hold is required');
    }
    const now = new Date();
    const checkoutToken = randomBytes(32).toString('hex');
    const claimed = await tx.eventSeat.updateMany({
      where: {
        holdToken: dto.holdToken,
        status: 'HELD',
        holdExpiresAt: { gt: now },
        bookingSeats: { none: {} },
      },
      data: {
        holdToken: checkoutToken,
        holdExpiresAt: new Date(Date.now() + this.ttlMs()),
      },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('The seat hold is missing or has expired');
    }
    const held = await tx.eventSeat.findMany({
      where: { eventSessionId: dto.eventSessionId, holdToken: checkoutToken },
      include: { seat: { select: { seatLabel: true } } },
    });
    if (held.length === 0) {
      throw new BadRequestException('The seat hold is missing or has expired');
    }
    const covered = await tx.eventSeat.findMany({
      where: { holdToken: checkoutToken, eventSessionId: { not: dto.eventSessionId } },
      select: { id: true },
    });
    if (dto.attendees && dto.attendees.length !== held.length) {
      throw new BadRequestException('Provide one attendee for each held seat');
    }
    const subtotal = held.reduce(
      (sum, seat) => sum.plus(seat.price),
      new Prisma.Decimal(0),
    );
    const attendees: AttendeeRecord[] = held.map((seat, index) => ({
      name: dto.attendees?.[index]?.name ?? dto.customerName,
      email: dto.attendees?.[index]?.email ?? dto.customerEmail,
      phone: dto.attendees?.[index]?.phone ?? dto.customerPhone,
      eventSeatId: seat.id,
      seatLabel: seat.seat.seatLabel,
    }));
    const booking = await this.insertBooking(tx, {
      eventSessionId: dto.eventSessionId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      quantity: held.length,
      subtotal,
      attendees,
    });
    await tx.bookingSeat.createMany({
      data: [
        ...held.map((seat) => ({
          bookingId: booking.id,
          eventSeatId: seat.id,
          price: seat.price,
        })),
        ...covered.map((seat) => ({
          bookingId: booking.id,
          eventSeatId: seat.id,
          price: 0,
        })),
      ],
    });
    if (subtotal.isZero()) {
      return this.payments.confirmFree(tx, booking.id);
    }
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  }

  private async createCapacityBooking(
    tx: Prisma.TransactionClient,
    dto: CreateBookingDto,
    session: { id: string; price: Prisma.Decimal; event: { bookingMode: BookingMode } },
  ) {
    if (!dto.quantity) {
      throw new BadRequestException('Quantity is required');
    }
    if (!dto.attendees || dto.attendees.length !== dto.quantity) {
      throw new BadRequestException('Provide one attendee for each place');
    }
    if (session.event.bookingMode === BookingMode.CAPACITY_BASED) {
      await this.inventory.assertCapacity(tx, session.id, dto.quantity);
    }
    const subtotal = new Prisma.Decimal(session.price).mul(dto.quantity);
    const attendees: AttendeeRecord[] = dto.attendees.map((attendee) => ({
      name: attendee.name,
      email: attendee.email ?? dto.customerEmail,
      phone: attendee.phone ?? dto.customerPhone,
    }));
    const booking = await this.insertBooking(tx, {
      eventSessionId: session.id,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      quantity: dto.quantity,
      subtotal,
      attendees,
    });
    if (subtotal.isZero()) {
      return this.payments.confirmFree(tx, booking.id);
    }
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  }

  private async insertBooking(
    tx: Prisma.TransactionClient,
    input: {
      eventSessionId: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      quantity: number;
      subtotal: Prisma.Decimal;
      attendees: AttendeeRecord[];
    },
  ) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await tx.booking.create({
          data: {
            bookingReference: `RASA${randomBytes(5).toString('hex').toUpperCase()}`,
            eventSessionId: input.eventSessionId,
            customerName: input.customerName.trim(),
            customerEmail: input.customerEmail.toLowerCase(),
            customerPhone: input.customerPhone.replace(/\s+/g, ''),
            quantity: input.quantity,
            subtotal: input.subtotal,
            discountAmount: 0,
            totalAmount: input.subtotal,
            attendees: input.attendees as unknown as Prisma.InputJsonValue,
          },
        });
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
    throw new BadRequestException('Could not create a booking reference');
  }

  private ttlMs() {
    return (this.config.get<number>('holds.ttlMinutes') ?? 5) * 60 * 1000;
  }
}
