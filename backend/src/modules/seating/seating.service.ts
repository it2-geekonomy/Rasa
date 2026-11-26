import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { rethrowPrisma } from '../../common/utils/prisma-error';
import {
  CreateSeatDto,
  CreateSectionDto,
  ListSeatsQueryDto,
  ListSectionsQueryDto,
  UpdateSeatDto,
  UpdateSectionDto,
} from './dto/seating.dto';

const seatInclude = {
  section: {
    select: {
      id: true,
      sectionCode: true,
      sectionName: true,
      venueId: true,
    },
  },
} satisfies Prisma.SeatInclude;

@Injectable()
export class SeatingService {
  constructor(private readonly prisma: PrismaService) {}

  async createSection(dto: CreateSectionDto) {
    await this.requireVenue(dto.venueId);
    try {
      return await this.prisma.seatingSection.create({
        data: {
          venueId: dto.venueId,
          sectionName: dto.sectionName,
          sectionCode: dto.sectionCode,
          displayOrder: dto.displayOrder ?? 0,
          layoutMetadata: dto.layoutMetadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      rethrowPrisma(error, {
        unique: 'This section code already exists for the venue',
      });
    }
  }

  async findSections(query: ListSectionsQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.SeatingSectionWhereInput = query.venueId
      ? { venueId: query.venueId }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.seatingSection.findMany({
        where,
        skip,
        take,
        orderBy: [{ displayOrder: 'asc' }, { sectionName: 'asc' }],
        include: {
          venue: { select: { id: true, name: true } },
          _count: { select: { seats: true } },
        },
      }),
      this.prisma.seatingSection.count({ where }),
    ]);
    return { data, meta: pageMeta(total, page, limit) };
  }

  async findSection(id: string) {
    const section = await this.prisma.seatingSection.findUnique({
      where: { id },
      include: {
        venue: { select: { id: true, name: true, venueType: true } },
        _count: { select: { seats: true } },
      },
    });
    if (!section) {
      throw new NotFoundException('Seating section not found');
    }
    return section;
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    await this.findSection(id);
    if (dto.venueId) {
      await this.requireVenue(dto.venueId);
    }
    try {
      return await this.prisma.seatingSection.update({
        where: { id },
        data: {
          ...dto,
          layoutMetadata: dto.layoutMetadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      rethrowPrisma(error, {
        unique: 'This section code already exists for the venue',
      });
    }
  }

  async removeSection(id: string) {
    await this.findSection(id);
    const seats = await this.prisma.seat.count({ where: { sectionId: id } });
    if (seats > 0) {
      throw new ConflictException(`This section still has ${seats} seats`);
    }
    await this.prisma.seatingSection.delete({ where: { id } });
    return { id };
  }

  async createSeat(dto: CreateSeatDto) {
    await this.findSection(dto.sectionId);
    try {
      return await this.prisma.seat.create({
        data: {
          sectionId: dto.sectionId,
          rowLabel: dto.rowLabel,
          seatNumber: dto.seatNumber,
          seatLabel: dto.seatLabel,
          seatType: dto.seatType,
          xPosition: dto.xPosition,
          yPosition: dto.yPosition,
          isActive: dto.isActive,
        },
        include: seatInclude,
      });
    } catch (error) {
      rethrowPrisma(error, { unique: 'This seat already exists in the section' });
    }
  }

  async findSeats(query: ListSeatsQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.SeatWhereInput = {
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.rowLabel ? { rowLabel: query.rowLabel } : {}),
      ...(query.seatType ? { seatType: query.seatType } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.seatLabel
        ? { seatLabel: { contains: query.seatLabel.trim(), mode: 'insensitive' } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.seat.findMany({
        where,
        skip,
        take,
        orderBy: [{ yPosition: 'asc' }, { seatNumber: 'asc' }],
        include: seatInclude,
      }),
      this.prisma.seat.count({ where }),
    ]);
    return { data, meta: pageMeta(total, page, limit) };
  }

  async findSeat(id: string) {
    const seat = await this.prisma.seat.findUnique({
      where: { id },
      include: seatInclude,
    });
    if (!seat) {
      throw new NotFoundException('Seat not found');
    }
    return seat;
  }

  async updateSeat(id: string, dto: UpdateSeatDto) {
    await this.findSeat(id);
    if (dto.sectionId) {
      await this.findSection(dto.sectionId);
    }
    try {
      return await this.prisma.seat.update({
        where: { id },
        data: dto,
        include: seatInclude,
      });
    } catch (error) {
      rethrowPrisma(error, { unique: 'This seat already exists in the section' });
    }
  }

  async removeSeat(id: string) {
    await this.findSeat(id);
    const allocated = await this.prisma.eventSeat.count({ where: { seatId: id } });
    if (allocated > 0) {
      throw new ConflictException('This seat is already allocated to a session');
    }
    await this.prisma.seat.delete({ where: { id } });
    return { id };
  }

  private async requireVenue(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id }, select: { id: true } });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
  }
}
