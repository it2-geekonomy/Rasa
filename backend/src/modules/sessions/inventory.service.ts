import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AllocationOwner,
  EventSeatStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { HoldSeatsDto, ListInventoryQueryDto, UpdateAllocationDto } from './dto/inventory.dto';

type Tx = Prisma.TransactionClient;

const seatView = {
  seat: {
    select: {
      id: true,
      rowLabel: true,
      seatNumber: true,
      seatLabel: true,
      seatType: true,
      xPosition: true,
      yPosition: true,
      section: {
        select: {
          id: true,
          sectionCode: true,
          sectionName: true,
          displayOrder: true,
        },
      },
    },
  },
} satisfies Prisma.EventSeatInclude;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async provision(
    tx: Tx,
    session: { id: string; venueId: string; price: Prisma.Decimal },
  ) {
    const seats = await tx.seat.findMany({
      where: { isActive: true, section: { venueId: session.venueId } },
      select: { id: true },
    });
    if (seats.length === 0) {
      throw new BadRequestException(
        'This venue has no physical seats for a seat-based session',
      );
    }
    const now = new Date();
    await tx.eventSeat.createMany({
      data: seats.map((seat) => ({
        eventSessionId: session.id,
        seatId: seat.id,
        allocationOwner: AllocationOwner.RASA,
        status: EventSeatStatus.BLOCKED,
        price: session.price,
        updatedAt: now,
      })),
    });
    return seats.length;
  }

  async sync(sessionId: string) {
    const session = await this.requireSession(sessionId);
    if (session.event.bookingMode !== 'SEAT_BASED') {
      throw new BadRequestException('Only seat-based sessions have a seat inventory');
    }
    const missing = await this.prisma.seat.findMany({
      where: {
        isActive: true,
        section: { venueId: session.venueId },
        eventSeats: { none: { eventSessionId: sessionId } },
      },
      select: { id: true },
    });
    if (missing.length === 0) {
      return { created: 0 };
    }
    const now = new Date();
    const created = await this.prisma.eventSeat.createMany({
      data: missing.map((seat) => ({
        eventSessionId: sessionId,
        seatId: seat.id,
        allocationOwner: AllocationOwner.RASA,
        status: EventSeatStatus.BLOCKED,
        price: session.price,
        updatedAt: now,
      })),
      skipDuplicates: true,
    });
    return { created: created.count };
  }

  async summary(sessionId: string) {
    await this.requireSession(sessionId);
    const groups = await this.prisma.eventSeat.groupBy({
      by: ['allocationOwner', 'status'],
      where: { eventSessionId: sessionId },
      _count: { _all: true },
    });
    const total = groups.reduce((sum, group) => sum + group._count._all, 0);
    return {
      sessionId,
      total,
      counts: groups.map((group) => ({
        allocationOwner: group.allocationOwner,
        status: group.status,
        count: group._count._all,
      })),
    };
  }

  async findSeats(sessionId: string, query: ListInventoryQueryDto) {
    await this.requireSession(sessionId);
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.EventSeatWhereInput = {
      eventSessionId: sessionId,
      ...(query.allocationOwner ? { allocationOwner: query.allocationOwner } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.sectionCode || query.rowLabel
        ? {
            seat: {
              ...(query.rowLabel ? { rowLabel: query.rowLabel } : {}),
              ...(query.sectionCode
                ? { section: { sectionCode: query.sectionCode } }
                : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.eventSeat.findMany({
        where,
        skip,
        take,
        orderBy: [{ seat: { yPosition: 'asc' } }, { seat: { seatNumber: 'asc' } }],
        include: seatView,
      }),
      this.prisma.eventSeat.count({ where }),
    ]);
    return {
      data: rows.map((row) => this.toAdminSeat(row)),
      meta: pageMeta(total, page, limit),
    };
  }

  async updateAllocation(sessionId: string, dto: UpdateAllocationDto) {
    if (
      dto.allocationOwner === undefined &&
      dto.status === undefined &&
      dto.price === undefined
    ) {
      throw new BadRequestException('Provide an allocation owner, status, or price to change');
    }
    if (!dto.eventSeatIds?.length && !dto.sectionCode && !dto.rowLabel) {
      throw new BadRequestException('Choose seats, a section, or a row to update');
    }
    if (
      dto.status === 'AVAILABLE' &&
      dto.allocationOwner &&
      dto.allocationOwner !== AllocationOwner.RASA
    ) {
      throw new BadRequestException('Only RASA seats can be made available');
    }
    await this.requireSession(sessionId);

    const where = this.allocationWhere(sessionId, dto);
    const matched = await this.prisma.eventSeat.findMany({
      where,
      select: { id: true, allocationOwner: true, status: true },
    });
    if (dto.eventSeatIds?.length && matched.length !== dto.eventSeatIds.length) {
      throw new BadRequestException(
        'Some seats are booked or do not belong to this session',
      );
    }
    if (matched.length === 0) {
      throw new BadRequestException('No eligible seats matched');
    }

    const ownerIsNotRasa =
      dto.allocationOwner !== undefined && dto.allocationOwner !== AllocationOwner.RASA;
    const nextStatus = ownerIsNotRasa ? EventSeatStatus.BLOCKED : dto.status;
    if (nextStatus === EventSeatStatus.AVAILABLE) {
      const blocked = matched.some(
        (seat) => (dto.allocationOwner ?? seat.allocationOwner) !== AllocationOwner.RASA,
      );
      if (blocked) {
        throw new BadRequestException('Only RASA seats can be made available');
      }
    }

    const clearsHold = dto.allocationOwner !== undefined || dto.status !== undefined;
    const updated = await this.prisma.eventSeat.updateMany({
      where: { id: { in: matched.map((seat) => seat.id) } },
      data: {
        allocationOwner: dto.allocationOwner,
        status: nextStatus,
        price: dto.price,
        ...(clearsHold ? { holdToken: null, holdExpiresAt: null } : {}),
      },
    });
    return { updated: updated.count };
  }

  async availability(sessionId: string) {
    const session = await this.requireSession(sessionId);
    if (session.event.bookingMode === 'SEAT_BASED') {
      await this.prisma.$transaction((tx) => this.releaseExpired(tx, sessionId));
      const rows = await this.prisma.eventSeat.findMany({
        where: { eventSessionId: sessionId },
        include: seatView,
      });
      const layout = this.toPublicLayout(session, rows);
      await this.maskDayPassSeats(session.id, layout.sections);
      return layout;
    }
    const capacity = await this.capacity(sessionId);
    return {
      sessionId,
      bookingMode: session.event.bookingMode,
      venue: { id: session.venue.id, name: session.venue.name },
      ...capacity,
    };
  }

  async hold(sessionId: string, dto: HoldSeatsDto) {
    const session = await this.requireSession(sessionId);
    if (session.event.bookingMode !== 'SEAT_BASED') {
      throw new BadRequestException('This session does not use reserved seats');
    }
    const holdToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.ttlMs());

    const seats = await this.prisma.$transaction(async (tx) => {
      await this.releaseExpired(tx, sessionId);
      const updated = await tx.eventSeat.updateMany({
        where: {
          id: { in: dto.eventSeatIds },
          eventSessionId: sessionId,
          allocationOwner: AllocationOwner.RASA,
          status: EventSeatStatus.AVAILABLE,
        },
        data: {
          status: EventSeatStatus.HELD,
          holdToken,
          holdExpiresAt: expiresAt,
        },
      });
      if (updated.count !== dto.eventSeatIds.length) {
        throw new ConflictException('One or more seats are no longer available');
      }
      const heldIds = await tx.eventSeat.findMany({
        where: { id: { in: dto.eventSeatIds } },
        select: { seatId: true },
      });
      await this.holdDayPassSeats(tx, sessionId, heldIds.map((seat) => seat.seatId), holdToken, expiresAt);
      return tx.eventSeat.findMany({
        where: { eventSessionId: sessionId, holdToken },
        include: seatView,
      });
    });

    return {
      holdToken,
      expiresAt,
      seats: seats.map((seat) => ({
        eventSeatId: seat.id,
        seatLabel: seat.seat.seatLabel,
        rowLabel: seat.seat.rowLabel,
        seatNumber: seat.seat.seatNumber,
        price: seat.price,
      })),
    };
  }

  async releaseHold(sessionId: string, holdToken: string) {
    await this.requireSession(sessionId);
    const inCheckout = await this.prisma.bookingSeat.count({
      where: {
        eventSeat: { holdToken, status: EventSeatStatus.HELD },
        booking: { bookingStatus: { in: ['PENDING', 'CONFIRMED'] } },
      },
    });
    if (inCheckout > 0) {
      throw new ConflictException('This hold is already in checkout');
    }
    const released = await this.prisma.eventSeat.updateMany({
      where: {
        holdToken,
        status: EventSeatStatus.HELD,
      },
      data: {
        status: EventSeatStatus.AVAILABLE,
        holdToken: null,
        holdExpiresAt: null,
      },
    });
    if (released.count === 0) {
      throw new NotFoundException('Hold not found');
    }
    return { released: released.count };
  }

  async capacity(sessionId: string, tx: Tx | PrismaService = this.prisma) {
    const session = await tx.eventSession.findUnique({
      where: { id: sessionId },
      select: { capacity: true, event: { select: { bookingMode: true } } },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    const since = new Date(Date.now() - this.ttlMs());
    const [confirmed, reserved] = await Promise.all([
      tx.booking.aggregate({
        where: { eventSessionId: sessionId, bookingStatus: 'CONFIRMED' },
        _sum: { quantity: true },
      }),
      tx.booking.aggregate({
        where: {
          eventSessionId: sessionId,
          bookingStatus: 'PENDING',
          createdAt: { gt: since },
        },
        _sum: { quantity: true },
      }),
    ]);
    const confirmedQty = confirmed._sum.quantity ?? 0;
    const reservedQty = reserved._sum.quantity ?? 0;
    const remaining =
      session.capacity == null
        ? null
        : Math.max(session.capacity - confirmedQty - reservedQty, 0);
    return {
      bookingMode: session.event.bookingMode,
      capacity: session.capacity,
      confirmed: confirmedQty,
      reserved: reservedQty,
      remaining,
    };
  }

  async assertCapacity(tx: Tx, sessionId: string, quantity: number) {
    await tx.$queryRaw`
      SELECT id FROM event_sessions WHERE id = CAST(${sessionId} AS uuid) FOR UPDATE
    `;
    const snapshot = await this.capacity(sessionId, tx);
    if (snapshot.bookingMode === 'SEAT_BASED') {
      throw new BadRequestException('This session uses seat holds');
    }
    if (snapshot.bookingMode === 'FREE_ENTRY' && snapshot.capacity == null) {
      return snapshot;
    }
    if (snapshot.remaining == null || quantity > snapshot.remaining) {
      throw new ConflictException('Not enough capacity remaining');
    }
    return snapshot;
  }

  async deleteWithSession(id: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.releaseExpired(tx, id);
      const [blocked, bookings, tickets] = await Promise.all([
        tx.eventSeat.count({
          where: {
            eventSessionId: id,
            OR: [
              { status: { in: [EventSeatStatus.HELD, EventSeatStatus.BOOKED] } },
              { bookingSeats: { some: {} } },
            ],
          },
        }),
        tx.booking.count({ where: { eventSessionId: id } }),
        tx.bookingTicket.count({ where: { eventSessionId: id } }),
      ]);
      if (blocked > 0 || bookings > 0 || tickets > 0) {
        throw new ConflictException(
          'This session still has held or booked seats, bookings, or tickets',
        );
      }
      await tx.eventSeat.deleteMany({ where: { eventSessionId: id } });
      await tx.eventSession.delete({ where: { id } });
    });
  }

  async expireStaleReservations(tx: Tx, sessionId: string) {
    await this.releaseExpired(tx, sessionId);
  }

  private async releaseExpired(tx: Tx, sessionId: string) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.ttlMs());
    await tx.booking.updateMany({
      where: {
        eventSessionId: sessionId,
        bookingStatus: 'PENDING',
        createdAt: { lte: cutoff },
        bookingSeats: { none: {} },
      },
      data: { bookingStatus: 'EXPIRED', paymentStatus: 'FAILED' },
    });

    const stale = await tx.eventSeat.findMany({
      where: {
        eventSessionId: sessionId,
        status: EventSeatStatus.HELD,
        holdExpiresAt: { lte: now },
      },
      select: { id: true, holdToken: true, bookingSeats: { select: { bookingId: true } } },
    });
    const bookingIds = [
      ...new Set(stale.flatMap((seat) => seat.bookingSeats.map((line) => line.bookingId))),
    ];
    if (bookingIds.length > 0) {
      await tx.booking.updateMany({
        where: { id: { in: bookingIds }, bookingStatus: 'PENDING' },
        data: { bookingStatus: 'EXPIRED', paymentStatus: 'FAILED' },
      });
    }
    if (stale.length > 0) {
      const tokens = [...new Set(stale.map((seat) => seat.holdToken).filter((token): token is string => Boolean(token)))];
      await tx.eventSeat.updateMany({
        where: {
          status: EventSeatStatus.HELD,
          OR: [
            { id: { in: stale.map((seat) => seat.id) } },
            ...(tokens.length > 0 ? [{ holdToken: { in: tokens } }] : []),
          ],
        },
        data: {
          status: EventSeatStatus.AVAILABLE,
          holdToken: null,
          holdExpiresAt: null,
        },
      });
    }
  }

  private async holdDayPassSeats(
    tx: Tx,
    sessionId: string,
    seatIds: string[],
    holdToken: string,
    expiresAt: Date,
  ) {
    const sessionIds = await this.dayPassSessionIds(tx, sessionId);
    if (sessionIds.length === 0 || seatIds.length === 0) return;
    const rows = await tx.eventSeat.findMany({
      where: { eventSessionId: { in: sessionIds }, seatId: { in: seatIds } },
      select: { id: true, status: true, allocationOwner: true },
    });
    const reservable = rows.filter(
      (row) =>
        row.allocationOwner === AllocationOwner.RASA &&
        (row.status === EventSeatStatus.AVAILABLE || row.status === EventSeatStatus.BLOCKED),
    );
    if (rows.length !== sessionIds.length * seatIds.length || reservable.length !== rows.length) {
      throw new ConflictException('That seat is already reserved for another show on the same day');
    }
    const updated = await tx.eventSeat.updateMany({
      where: {
        id: { in: reservable.map((row) => row.id) },
        allocationOwner: AllocationOwner.RASA,
        status: { in: [EventSeatStatus.AVAILABLE, EventSeatStatus.BLOCKED] },
      },
      data: { status: EventSeatStatus.HELD, holdToken, holdExpiresAt: expiresAt },
    });
    if (updated.count !== reservable.length) {
      throw new ConflictException('That seat is already reserved for another show on the same day');
    }
  }

  private async dayPassSessionIds(db: Tx | PrismaService, sessionId: string) {
    const session = await db.eventSession.findUnique({
      where: { id: sessionId },
      select: { id: true, venueId: true, startAt: true, event: { select: { slug: true } } },
    });
    if (!session || session.event.slug !== 'fusion-express') return [];
    const { from, to } = istDayBounds(session.startAt);
    const others = await db.eventSession.findMany({
      where: {
        id: { not: session.id },
        venueId: session.venueId,
        status: { not: 'CANCELLED' },
        startAt: { gte: from, lt: to },
        event: { bookingMode: 'SEAT_BASED', status: 'PUBLISHED' },
      },
      select: { id: true },
    });
    return others.map((row) => row.id);
  }

  private async maskDayPassSeats(
    sessionId: string,
    sections: Array<{ seats: Array<Record<string, unknown>> }>,
  ) {
    const sessionIds = await this.dayPassSessionIds(this.prisma, sessionId);
    if (sessionIds.length === 0) return sections;
    const seatIds = sections.flatMap((section) => section.seats.map((seat) => String(seat.seatId)));
    const rows = await this.prisma.eventSeat.findMany({
      where: { eventSessionId: { in: sessionIds }, seatId: { in: seatIds } },
      select: { seatId: true, eventSessionId: true, status: true, allocationOwner: true },
    });
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = grouped.get(row.seatId) ?? [];
      list.push(row);
      grouped.set(row.seatId, list);
    }
    for (const section of sections) {
      for (const seat of section.seats) {
        if (seat.bookable !== true) continue;
        const matches = grouped.get(String(seat.seatId)) ?? [];
        if (matches.length !== sessionIds.length) {
          seat.bookable = false;
          seat.status = 'BLOCKED';
          continue;
        }
        if (matches.some((row) => row.allocationOwner !== AllocationOwner.RASA || row.status === 'BOOKED')) {
          seat.bookable = false;
          seat.status = 'BOOKED';
          continue;
        }
        if (matches.some((row) => row.status === 'HELD')) {
          seat.bookable = false;
          seat.status = 'HELD';
        }
      }
    }
    return sections;
  }

  private allocationWhere(sessionId: string, dto: UpdateAllocationDto): Prisma.EventSeatWhereInput {
    return {
      eventSessionId: sessionId,
      status: { not: EventSeatStatus.BOOKED },
      ...(dto.eventSeatIds?.length ? { id: { in: dto.eventSeatIds } } : {}),
      ...(dto.sectionCode || dto.rowLabel || dto.seatNumberFrom || dto.seatNumberTo
        ? {
            seat: {
              ...(dto.rowLabel ? { rowLabel: dto.rowLabel } : {}),
              ...(dto.seatNumberFrom || dto.seatNumberTo
                ? {
                    seatNumber: {
                      ...(dto.seatNumberFrom ? { gte: dto.seatNumberFrom } : {}),
                      ...(dto.seatNumberTo ? { lte: dto.seatNumberTo } : {}),
                    },
                  }
                : {}),
              ...(dto.sectionCode ? { section: { sectionCode: dto.sectionCode } } : {}),
            },
          }
        : {}),
    };
  }

  private async requireSession(id: string) {
    const session = await this.prisma.eventSession.findUnique({
      where: { id },
      include: {
        event: { select: { bookingMode: true, title: true } },
        venue: { select: { id: true, name: true } },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  private ttlMs() {
    const minutes = this.config.get<number>('holds.ttlMinutes') ?? 5;
    return minutes * 60 * 1000;
  }

  private toAdminSeat(row: Prisma.EventSeatGetPayload<{ include: typeof seatView }>) {
    return {
      id: row.id,
      allocationOwner: row.allocationOwner,
      status: row.status,
      price: row.price,
      holdExpiresAt: row.holdExpiresAt,
      seat: row.seat,
    };
  }

  private toPublicLayout(
    session: Awaited<ReturnType<InventoryService['requireSession']>>,
    rows: Prisma.EventSeatGetPayload<{ include: typeof seatView }>[],
  ) {
    const sections = new Map<
      string,
      {
        sectionCode: string;
        sectionName: string;
        displayOrder: number;
        seats: Array<Record<string, unknown>>;
      }
    >();
    for (const row of rows) {
      const section = row.seat.section;
      let bucket = sections.get(section.id);
      if (!bucket) {
        bucket = {
          sectionCode: section.sectionCode,
          sectionName: section.sectionName,
          displayOrder: section.displayOrder,
          seats: [],
        };
        sections.set(section.id, bucket);
      }
      const view = this.customerView(row.allocationOwner, row.status);
      bucket.seats.push({
        eventSeatId: row.id,
        seatId: row.seat.id,
        rowLabel: row.seat.rowLabel,
        seatNumber: row.seat.seatNumber,
        seatLabel: row.seat.seatLabel,
        seatType: row.seat.seatType,
        xPosition: row.seat.xPosition,
        yPosition: row.seat.yPosition,
        price: row.price,
        status: view.status,
        bookable: view.bookable,
      });
    }
    const ordered = [...sections.values()].sort((a, b) => a.displayOrder - b.displayOrder);
    for (const section of ordered) {
      section.seats.sort((a, b) => {
        const ay = Number(a.yPosition ?? 0);
        const by = Number(b.yPosition ?? 0);
        if (ay !== by) return ay - by;
        return Number(a.seatNumber) - Number(b.seatNumber);
      });
    }
    return {
      sessionId: session.id,
      bookingMode: session.event.bookingMode,
      venue: { id: session.venue.id, name: session.venue.name },
      sections: ordered,
    };
  }

  private customerView(owner: AllocationOwner, status: EventSeatStatus) {
    if (owner === AllocationOwner.RASA && status === EventSeatStatus.AVAILABLE) {
      return { status: 'AVAILABLE', bookable: true };
    }
    if (owner === AllocationOwner.RASA && status === EventSeatStatus.HELD) {
      return { status: 'HELD', bookable: false };
    }
    if (owner === AllocationOwner.RASA && status === EventSeatStatus.BOOKED) {
      return { status: 'BOOKED', bookable: false };
    }
    return { status: 'BLOCKED', bookable: false };
  }
}

function istDayBounds(instant: Date) {
  const shift = 330 * 60 * 1000;
  const ist = new Date(instant.getTime() + shift);
  const from = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - shift;
  return { from: new Date(from), to: new Date(from + 24 * 60 * 60 * 1000) };
}
