import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { rethrowPrisma } from '../../common/utils/prisma-error';
import { CreateVenueDto, ListVenuesQueryDto, UpdateVenueDto } from './dto/venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVenueDto) {
    try {
      return await this.prisma.venue.create({ data: dto });
    } catch (error) {
      rethrowPrisma(error, { unique: 'A venue with this name already exists' });
    }
  }

  async findAll(query: ListVenuesQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.VenueWhereInput = {
      ...(query.venueType ? { venueType: query.venueType } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? { name: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { sections: true, sessions: true } } },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return { data, meta: pageMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
          include: { _count: { select: { seats: true } } },
        },
        _count: { select: { sessions: true } },
      },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    return venue;
  }

  async update(id: string, dto: UpdateVenueDto) {
    await this.findOne(id);
    try {
      return await this.prisma.venue.update({ where: { id }, data: dto });
    } catch (error) {
      rethrowPrisma(error, { unique: 'A venue with this name already exists' });
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    const [sections, sessions] = await Promise.all([
      this.prisma.seatingSection.count({ where: { venueId: id } }),
      this.prisma.eventSession.count({ where: { venueId: id } }),
    ]);
    if (sections > 0 || sessions > 0) {
      throw new ConflictException(
        'This venue still has seating sections or sessions',
      );
    }
    await this.prisma.venue.delete({ where: { id } });
    return { id };
  }
}
