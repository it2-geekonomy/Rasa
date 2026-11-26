import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { rethrowPrisma } from '../../common/utils/prisma-error';
import { slugify } from '../../common/utils/slug';
import { CreateEventDto, ListEventsQueryDto, UpdateEventDto } from './dto/event.dto';

const eventListSelect = {
  id: true,
  title: true,
  slug: true,
  category: true,
  eventType: true,
  bookingMode: true,
  shortDescription: true,
  bannerImage: true,
  status: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { sessions: true } },
} satisfies Prisma.EventSelect;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto, adminId: string) {
    const slug = dto.slug?.trim()
      ? dto.slug.trim()
      : await this.uniqueSlug(dto.title);
    try {
      return await this.prisma.event.create({
        data: {
          title: dto.title,
          slug,
          category: dto.category,
          eventType: dto.eventType,
          bookingMode: dto.bookingMode,
          description: dto.description,
          shortDescription: dto.shortDescription,
          bannerImage: dto.bannerImage,
          status: dto.status,
          isFeatured: dto.isFeatured,
          createdBy: adminId,
        },
      });
    } catch (error) {
      rethrowPrisma(error, { unique: 'An event with this slug already exists' });
    }
  }

  async findAll(query: ListEventsQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.EventWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.bookingMode ? { bookingMode: query.bookingMode } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { title: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: eventListSelect,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { data, meta: pageMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        admin: { select: { id: true, name: true, email: true } },
        sessions: {
          orderBy: { startAt: 'asc' },
          include: { venue: { select: { id: true, name: true, venueType: true } } },
        },
      },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({
      where: { id },
      select: { id: true, title: true, slug: true },
    });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    let slug = dto.slug?.trim();
    if (dto.slug !== undefined && !slug) {
      slug = await this.uniqueSlug(dto.title ?? existing.title, id);
    }

    try {
      return await this.prisma.event.update({
        where: { id },
        data: {
          title: dto.title,
          slug,
          category: dto.category,
          eventType: dto.eventType,
          bookingMode: dto.bookingMode,
          description: dto.description,
          shortDescription: dto.shortDescription,
          bannerImage: dto.bannerImage,
          status: dto.status,
          isFeatured: dto.isFeatured,
        },
      });
    } catch (error) {
      rethrowPrisma(error, { unique: 'An event with this slug already exists' });
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    const sessions = await this.prisma.eventSession.count({ where: { eventId: id } });
    if (sessions > 0) {
      throw new ConflictException('This event still has sessions');
    }
    await this.prisma.event.delete({ where: { id } });
    return { id };
  }

  private async uniqueSlug(title: string, ignoreId?: string) {
    const base = slugify(title);
    let slug = base;
    let suffix = 1;
    while (true) {
      const existing = await this.prisma.event.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existing || existing.id === ignoreId) {
        return slug;
      }
      suffix += 1;
      slug = `${base.slice(0, 240)}-${suffix}`;
    }
  }
}
