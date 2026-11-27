import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { rethrowPrisma } from '../../common/utils/prisma-error';
import {
  CreateSessionDto,
  ListSessionsQueryDto,
  UpdateSessionDto,
} from './dto/session.dto';
import { InventoryService } from './inventory.service';

const sessionInclude = {
  event: { select: { id: true, title: true, slug: true, bookingMode: true, status: true } },
  venue: { select: { id: true, name: true, venueType: true } },
} satisfies Prisma.EventSessionInclude;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async create(dto: CreateSessionDto) {
    const event = await this.requireEvent(dto.eventId);
    const venue = await this.requireVenue(dto.venueId);
    this.assertVenueBooking(event.bookingMode, venue, dto.capacity);
    this.assertTimes(dto.startAt, dto.endAt, dto.bookingOpenAt, dto.bookingCloseAt);
    const capacity = event.bookingMode === 'SEAT_BASED' ? null : dto.capacity;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const session = await tx.eventSession.create({
            data: {
              eventId: dto.eventId,
              venueId: dto.venueId,
              sessionName: dto.sessionName,
              startAt: new Date(dto.startAt),
              endAt: new Date(dto.endAt),
              capacity,
              price: dto.price ?? 0,
              bookingOpenAt: dto.bookingOpenAt ? new Date(dto.bookingOpenAt) : undefined,
              bookingCloseAt: dto.bookingCloseAt ? new Date(dto.bookingCloseAt) : undefined,
              status: dto.status,
            },
            include: sessionInclude,
          });
          const inventoryCount =
            event.bookingMode === 'SEAT_BASED'
              ? await this.inventory.provision(tx, session)
              : 0;
          return { ...session, inventoryCount };
        },
        { timeout: 20000 },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      rethrowPrisma(error, { inUse: 'Event or venue could not be linked' });
    }
  }

  async findAll(query: ListSessionsQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.EventSessionWhereInput = {
      ...(query.eventId ? { eventId: query.eventId } : {}),
      ...(query.venueId ? { venueId: query.venueId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.eventSession.findMany({
        where,
        skip,
        take,
        orderBy: { startAt: 'asc' },
        include: sessionInclude,
      }),
      this.prisma.eventSession.count({ where }),
    ]);
    return { data, meta: pageMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const session = await this.prisma.eventSession.findUnique({
      where: { id },
      include: sessionInclude,
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async update(id: string, dto: UpdateSessionDto) {
    const existing = await this.prisma.eventSession.findUnique({
      where: { id },
      include: { event: { select: { bookingMode: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Session not found');
    }
    if (dto.capacity != null && existing.event.bookingMode === 'SEAT_BASED') {
      throw new BadRequestException('The Auditorium uses seat blocks, not a slot count');
    }
    if (dto.capacity != null && existing.event.bookingMode === 'CAPACITY_BASED') {
      const snapshot = await this.inventory.capacity(id);
      const used = snapshot.confirmed + snapshot.reserved;
      if (dto.capacity < used) {
        throw new BadRequestException(
        `The slot count cannot be lower than the ${used} slots already taken`,
        );
      }
    }
    const venueId = dto.venueId ?? existing.venueId;
    const eventId = dto.eventId ?? existing.eventId;
    const [event, venue] = await Promise.all([
      this.requireEvent(eventId),
      this.requireVenue(venueId),
    ]);
    this.assertVenueBooking(event.bookingMode, venue, dto.capacity ?? existing.capacity);
    if (
      (dto.eventId && dto.eventId !== existing.eventId) ||
      (dto.venueId && dto.venueId !== existing.venueId)
    ) {
      await this.assertMovable(id);
    }

    const startAt = dto.startAt ?? existing.startAt.toISOString();
    const endAt = dto.endAt ?? existing.endAt.toISOString();
    const bookingOpenAt =
      dto.bookingOpenAt ?? existing.bookingOpenAt?.toISOString() ?? undefined;
    const bookingCloseAt =
      dto.bookingCloseAt ?? existing.bookingCloseAt?.toISOString() ?? undefined;
    this.assertTimes(startAt, endAt, bookingOpenAt, bookingCloseAt);

    return this.prisma.eventSession.update({
      where: { id },
      data: {
        eventId: dto.eventId,
        venueId: dto.venueId,
        sessionName: dto.sessionName,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        capacity: dto.capacity,
        price: dto.price,
        bookingOpenAt: dto.bookingOpenAt ? new Date(dto.bookingOpenAt) : undefined,
        bookingCloseAt: dto.bookingCloseAt ? new Date(dto.bookingCloseAt) : undefined,
        status: dto.status,
      },
      include: sessionInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.inventory.deleteWithSession(id);
    return { id };
  }

  private assertTimes(
    startAt: string,
    endAt: string,
    bookingOpenAt?: string,
    bookingCloseAt?: string,
  ) {
    if (new Date(endAt) <= new Date(startAt)) {
      throw new BadRequestException('Session end time must be after the start time');
    }
    if (
      bookingOpenAt &&
      bookingCloseAt &&
      new Date(bookingCloseAt) <= new Date(bookingOpenAt)
    ) {
      throw new BadRequestException('Booking close time must be after booking open time');
    }
  }

  private async assertMovable(id: string) {
    const [inventory, bookings] = await Promise.all([
      this.prisma.eventSeat.count({ where: { eventSessionId: id } }),
      this.prisma.booking.count({ where: { eventSessionId: id } }),
    ]);
    if (inventory > 0 || bookings > 0) {
      throw new ConflictException(
        'This session already has inventory or bookings and cannot be moved',
      );
    }
  }

  private assertVenueBooking(
    bookingMode: string,
    venue: { name: string; venueType: string },
    capacity?: number | Prisma.Decimal | null,
  ) {
    if (venue.venueType === 'RESERVED_SEATING') {
      if (bookingMode !== 'SEAT_BASED') {
        throw new BadRequestException(
          `${venue.name} uses seat blocks. Set this event to seat-based booking.`,
        );
      }
      return;
    }
    if (bookingMode === 'SEAT_BASED') {
      throw new BadRequestException(
        `Seat blocks are only for the Auditorium. ${venue.name} uses a number of slots.`,
      );
    }
    if (bookingMode === 'CAPACITY_BASED' && (capacity == null || Number(capacity) < 1)) {
      throw new BadRequestException(`Enter how many slots this ${venue.name} session has.`);
    }
  }

  private async requireEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { id: true, bookingMode: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  private async requireVenue(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      select: { id: true, name: true, venueType: true },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    return venue;
  }
}
