import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, BookingStatus } from '@prisma/client';
import Razorpay = require('razorpay');
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { ListPaymentsQueryDto, VerifyPaymentDto } from './dto/payment.dto';
import { TicketMailer } from '../tickets/ticket-mailer.service';
import { TicketsService } from '../tickets/tickets.service';
import { checkoutSignature, signaturesMatch, webhookSignature } from './razorpay.util';

type Tx = Prisma.TransactionClient;

export type CheckoutPayload = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: 'INR';
  paymentId: string;
};

const paymentSelect = {
  id: true,
  bookingId: true,
  amount: true,
  currency: true,
  status: true,
  razorpayOrderId: true,
  razorpayPaymentId: true,
  paidAt: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tickets: TicketsService,
    private readonly mailer: TicketMailer,
  ) {}

  async createCheckout(bookingId: string): Promise<CheckoutPayload> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bookingSeats: { select: { eventSeatId: true } } },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.bookingStatus !== BookingStatus.PENDING) {
      throw new ConflictException('This booking is no longer awaiting payment');
    }
    await this.assertReservation(booking);
    const { keyId, keySecret } = this.credentials(booking.bookingReference);
    const amount = this.toPaise(booking.totalAmount);
    let orderId: string;
    try {
      const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const order = await client.orders.create({
        amount,
        currency: 'INR',
        receipt: booking.bookingReference.slice(0, 40),
        notes: { bookingId: booking.id },
      });
      orderId = order.id;
    } catch (error) {
      const detail = razorpayError(error);
      this.logger.error(`Razorpay order failed for ${booking.bookingReference}: ${detail}`);
      const rejectedKeys = detail === 'Authentication failed';
      throw new BadGatewayException(
        rejectedKeys
          ? `Razorpay rejected the API keys. Booking ${booking.bookingReference} stays pending.`
          : `Could not start checkout for ${booking.bookingReference}: ${detail}`,
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.totalAmount,
        currency: 'INR',
        status: 'CREATED',
        razorpayOrderId: orderId,
      },
      select: paymentSelect,
    });
    return {
      keyId,
      orderId,
      amount,
      currency: 'INR',
      paymentId: payment.id,
    };
  }

  async createCartCheckout(bookingIds: string[]) {
    if (bookingIds.length === 1) {
      return this.createCheckout(bookingIds[0]);
    }
    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: {
        id: true,
        bookingReference: true,
        totalAmount: true,
        bookingStatus: true,
        paymentStatus: true,
      },
    });
    if (bookings.length !== bookingIds.length) {
      throw new NotFoundException('One or more bookings were not found');
    }
    const total = bookings.reduce(
      (sum, b) => sum.plus(b.totalAmount),
      new Prisma.Decimal(0),
    );
    const amount = this.toPaise(total);
    if (amount <= 0) {
      throw new BadRequestException('Free bookings do not need Razorpay checkout');
    }

    const { keyId, keySecret } = this.credentials();
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    let orderId: string;
    try {
      const order = await client.orders.create({
        amount,
        currency: 'INR',
        receipt: bookings[0].bookingReference,
        notes: {
          cartBookingIds: bookingIds.join(','),
        },
      });
      orderId = order.id;
    } catch (error) {
      const detail = razorpayError(error);
      this.logger.error(`Razorpay cart order failed: ${detail}`);
      throw new BadGatewayException(
        detail.includes('Authentication failed')
          ? 'Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.'
          : 'Could not start Razorpay checkout. Your bookings stay pending.',
      );
    }

    const primary = await this.prisma.payment.create({
      data: {
        bookingId: bookings[0].id,
        provider: 'RAZORPAY',
        razorpayOrderId: orderId,
        amount: bookings[0].totalAmount,
        currency: 'INR',
        status: 'CREATED',
      },
    });
    for (let index = 1; index < bookings.length; index += 1) {
      await this.prisma.payment.create({
        data: {
          bookingId: bookings[index].id,
          provider: 'RAZORPAY_CART',
          razorpayOrderId: `${orderId}#${index}`,
          amount: bookings[index].totalAmount,
          currency: 'INR',
          status: 'CREATED',
        },
      });
    }

    return {
      keyId,
      orderId,
      amount,
      currency: 'INR',
      paymentId: primary.id,
    };
  }

  async verify(dto: VerifyPaymentDto) {
    const { keySecret } = this.credentials();
    const expected = checkoutSignature(dto.razorpayOrderId, dto.razorpayPaymentId, keySecret);
    if (!signaturesMatch(expected, dto.razorpaySignature)) {
      throw new UnauthorizedException('Invalid payment signature');
    }
    const result = await this.capture({
      orderId: dto.razorpayOrderId,
      paymentId: dto.razorpayPaymentId,
      signature: dto.razorpaySignature,
    });
    if (result.outcome === 'late') {
      throw new ConflictException(
        'Payment was received after the reservation expired. The seats were not confirmed.',
      );
    }
    if (result.outcome === 'confirmed' && result.booking) {
      void this.mailer.deliver(result.booking.id);
    }
    const companions = await this.captureCartCompanions(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    for (const item of companions) {
      if (item.outcome === 'confirmed' && item.booking) {
        void this.mailer.deliver(item.booking.id);
      }
    }
    return result.booking;
  }

  async handleWebhook(rawBody: Buffer, signature: string, body: unknown) {
    const secret = this.config.get<string>('razorpay.webhookSecret') ?? '';
    if (!secret) {
      throw new ServiceUnavailableException('Razorpay webhook secret is not configured');
    }
    const expected = webhookSignature(rawBody, secret);
    if (!signature || !signaturesMatch(expected, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    const event = body as {
      event?: string;
      payload?: {
        payment?: {
          entity?: { id?: string; order_id?: string; amount?: number; status?: string };
        };
      };
    };
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id;
    const paymentId = payment?.id;
    if (!orderId || !paymentId) {
      return { received: true, ignored: true };
    }
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const result = await this.capture({
        orderId,
        paymentId,
        amountPaise: payment?.amount,
      });
      if (result.outcome === 'confirmed' && result.booking) {
        void this.mailer.deliver(result.booking.id);
      }
      const companions = await this.captureCartCompanions(orderId, paymentId);
      for (const item of companions) {
        if (item.outcome === 'confirmed' && item.booking) {
          void this.mailer.deliver(item.booking.id);
        }
      }
      if (result.outcome === 'ignored') {
        return { received: true, ignored: true };
      }
      return { received: true, outcome: result.outcome };
    }
    if (event.event === 'payment.failed') {
      await this.markFailed(orderId, paymentId);
      return { received: true, outcome: 'failed' };
    }
    return { received: true, ignored: true };
  }

  async findAll(query: ListPaymentsQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.PaymentWhereInput = {
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: paymentSelect,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: pageMeta(total, page, limit) };
  }

  async confirmFree(tx: Tx, bookingId: string) {
    const result = await this.finalize(tx, bookingId, null);
    if (!result.taken) {
      throw new ConflictException('One or more seats are no longer held for this booking');
    }
    return result.booking;
  }

  private async captureCartCompanions(orderId: string, paymentId: string, signature?: string) {
    const companions = await this.prisma.payment.findMany({
      where: { razorpayOrderId: { startsWith: `${orderId}#` } },
      select: { razorpayOrderId: true },
      orderBy: { createdAt: 'asc' },
    });
    const results = [];
    for (let index = 0; index < companions.length; index += 1) {
      const companionOrderId = companions[index].razorpayOrderId;
      if (!companionOrderId) continue;
      results.push(
        await this.capture({
          orderId: companionOrderId,
          paymentId: `${paymentId}#${index + 1}`,
          signature,
        }),
      );
    }
    return results;
  }

  private async capture(input: {
    orderId: string;
    paymentId: string;
    signature?: string;
    amountPaise?: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { razorpayOrderId: input.orderId },
      });
      if (!payment) {
        return { outcome: 'ignored' as const, booking: null };
      }
      if (
        input.amountPaise !== undefined &&
        input.amountPaise !== this.toPaise(payment.amount)
      ) {
        throw new BadRequestException('Payment amount does not match the booking');
      }
      await tx.$queryRaw`
        SELECT id FROM bookings WHERE id = CAST(${payment.bookingId} AS uuid) FOR UPDATE
      `;
      const booking = await tx.booking.findUnique({
        where: { id: payment.bookingId },
        include: { bookingSeats: { select: { eventSeatId: true } } },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (
        booking.bookingStatus === BookingStatus.CONFIRMED &&
        current?.razorpayPaymentId === input.paymentId
      ) {
        return { outcome: 'already' as const, booking: await this.loadBooking(tx, booking.id) };
      }
      if (booking.bookingStatus !== BookingStatus.PENDING) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            razorpayPaymentId: input.paymentId,
            razorpaySignature: input.signature,
            paidAt: new Date(),
          },
        });
        return { outcome: 'late' as const, booking: await this.loadBooking(tx, booking.id) };
      }
      const result = await this.finalize(tx, booking.id, {
        paymentRowId: payment.id,
        paymentId: input.paymentId,
        signature: input.signature,
        seatIds: booking.bookingSeats.map((line) => line.eventSeatId),
      });
      return {
        outcome: result.taken ? ('confirmed' as const) : ('late' as const),
        booking: result.booking,
      };
    });
  }

  private async finalize(
    tx: Tx,
    bookingId: string,
    captured: {
      paymentRowId: string;
      paymentId: string;
      signature?: string;
      seatIds: string[];
    } | null,
  ) {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { bookingSeats: { select: { eventSeatId: true } } },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const seatIds = captured?.seatIds ?? booking.bookingSeats.map((line) => line.eventSeatId);
    if (seatIds.length > 0) {
      const booked = await tx.eventSeat.updateMany({
        where: { id: { in: seatIds }, status: 'HELD' },
        data: { status: 'BOOKED', holdToken: null, holdExpiresAt: null },
      });
      if (booked.count !== seatIds.length) {
        if (captured) {
          await tx.payment.update({
            where: { id: captured.paymentRowId },
            data: {
              status: 'CAPTURED',
              razorpayPaymentId: captured.paymentId,
              razorpaySignature: captured.signature,
              paidAt: new Date(),
            },
          });
          await tx.booking.update({
            where: { id: bookingId },
            data: { bookingStatus: 'EXPIRED' },
          });
        }
        return { taken: false, booking: await this.loadBooking(tx, bookingId) };
      }
    }
    if (captured) {
      await tx.payment.update({
        where: { id: captured.paymentRowId },
        data: {
          status: 'CAPTURED',
          razorpayPaymentId: captured.paymentId,
          razorpaySignature: captured.signature,
          paidAt: new Date(),
        },
      });
    } else {
      await tx.payment.create({
        data: {
          bookingId,
          provider: 'NONE',
          amount: booking.totalAmount,
          currency: booking.currency,
          status: 'CAPTURED',
          paidAt: new Date(),
        },
      });
    }
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        bookedAt: new Date(),
      },
    });
    await this.tickets.issue(tx, bookingId);
    return { taken: true, booking: await this.loadBooking(tx, bookingId) };
  }

  private async markFailed(orderId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!payment || payment.status === 'CAPTURED') {
      return;
    }
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', razorpayPaymentId: payment.razorpayPaymentId ?? paymentId },
    });
    await this.prisma.booking.updateMany({
      where: { id: payment.bookingId, bookingStatus: 'PENDING' },
      data: { paymentStatus: 'FAILED' },
    });
  }

  private async assertReservation(booking: {
    id: string;
    createdAt: Date;
    bookingSeats: { eventSeatId: string }[];
  }) {
    if (booking.bookingSeats.length === 0) {
      const ttlMs = (this.config.get<number>('holds.ttlMinutes') ?? 5) * 60 * 1000;
      if (booking.createdAt.getTime() + ttlMs <= Date.now()) {
        throw new ConflictException('This reservation has expired');
      }
      return;
    }
    const held = await this.prisma.eventSeat.count({
      where: {
        id: { in: booking.bookingSeats.map((line) => line.eventSeatId) },
        status: 'HELD',
      },
    });
    if (held !== booking.bookingSeats.length) {
      throw new ConflictException('This reservation has expired');
    }
  }

  private credentials(reference?: string) {
    const keyId = (this.config.get<string>('razorpay.keyId') ?? '').trim();
    const keySecret = (this.config.get<string>('razorpay.keySecret') ?? '').trim();
    if (!keyId || !keySecret) {
      const suffix = reference ? ` Booking ${reference} stays pending.` : '';
      throw new ServiceUnavailableException(`Razorpay is not configured.${suffix}`);
    }
    return { keyId, keySecret };
  }

  private toPaise(amount: Prisma.Decimal | number) {
    return new Prisma.Decimal(amount).mul(100).toDecimalPlaces(0).toNumber();
  }

  private loadBooking(tx: Tx, id: string) {
    return tx.booking.findUniqueOrThrow({ where: { id }, include: bookingInclude });
  }
}

function razorpayError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const body = error as { error?: { description?: string; code?: string } };
    return body.error?.description || body.error?.code || 'unknown error';
  }
  return 'unknown error';
}

export const bookingInclude = {
  session: {
    select: {
      id: true,
      sessionName: true,
      startAt: true,
      endAt: true,
      event: { select: { id: true, title: true, bookingMode: true } },
      venue: { select: { id: true, name: true } },
    },
  },
  bookingSeats: {
    include: {
      eventSeat: {
        include: {
          seat: { select: { seatLabel: true, rowLabel: true, seatNumber: true, seatType: true } },
        },
      },
    },
  },
  payments: {
    orderBy: { createdAt: 'desc' as const },
    select: paymentSelect,
  },
  tickets: {
    orderBy: { ticketNumber: 'asc' as const },
    include: {
      session: {
        select: {
          sessionName: true,
          startAt: true,
          endAt: true,
          event: { select: { title: true } },
          venue: { select: { name: true } },
        },
      },
      bookingSeat: {
        select: {
          eventSeat: {
            select: {
              seat: { select: { seatLabel: true, rowLabel: true, seatNumber: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.BookingInclude;
