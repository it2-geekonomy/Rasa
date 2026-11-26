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
import Razorpay from 'razorpay';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { ListPaymentsQueryDto, VerifyPaymentDto } from './dto/payment.dto';
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
      this.logger.error(
        `Razorpay order failed for ${booking.bookingReference}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new BadGatewayException(
        `Could not start checkout for ${booking.bookingReference}. Retry payment for this booking.`,
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
      const ttlMs = (this.config.get<number>('holds.ttlMinutes') ?? 10) * 60 * 1000;
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
    const keyId = this.config.get<string>('razorpay.keyId') ?? '';
    const keySecret = this.config.get<string>('razorpay.keySecret') ?? '';
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
