import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { rethrowPrisma } from '../../common/utils/prisma-error';
import { buildUniqueSlug } from '../../common/utils/slug';
import { CreateEventDto, ListEventsQueryDto, UpdateEventDto } from './dto/event.dto';

const eventArtistsInclude = {
  orderBy: { sortOrder: 'asc' as const },
  include: {
    artist: {
      select: {
        id: true,
        name: true,
        slug: true,
        designation: true,
        profileImage: true,
      },
    },
  },
};

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
  _count: { select: { sessions: true, artists: true } },
  artists: eventArtistsInclude,
} satisfies Prisma.EventSelect;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto, adminId: string) {
    const slug = dto.slug?.trim()
      ? dto.slug.trim()
      : await this.uniqueSlug(dto.title);
    const artistIds = await this.validateArtistIds(dto.artistIds);

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
          bannerImage: dto.bannerImage?.trim() || null,
          status: dto.status,
          isFeatured: dto.isFeatured,
          createdBy: adminId,
          ...(artistIds && artistIds.length > 0
            ? {
                artists: {
                  create: artistIds.map((artistId, index) => ({
                    artistId,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: {
          artists: eventArtistsInclude,
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
        artists: eventArtistsInclude,
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

    const artistIds = await this.validateArtistIds(dto.artistIds);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (artistIds !== undefined) {
          await tx.eventArtist.deleteMany({ where: { eventId: id } });
          if (artistIds.length > 0) {
            await tx.eventArtist.createMany({
              data: artistIds.map((artistId, index) => ({
                eventId: id,
                artistId,
                sortOrder: index,
              })),
            });
          }
        }
        return tx.event.update({
          where: { id },
          data: {
            title: dto.title,
            slug,
            category: dto.category,
            eventType: dto.eventType,
            bookingMode: dto.bookingMode,
            description: dto.description,
            shortDescription: dto.shortDescription,
            bannerImage:
              dto.bannerImage !== undefined ? dto.bannerImage.trim() || null : undefined,
            status: dto.status,
            isFeatured: dto.isFeatured,
          },
          include: {
            artists: eventArtistsInclude,
          },
        });
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

  private async validateArtistIds(rawIds?: string[]) {
    if (rawIds === undefined) return undefined;
    const unique = [...new Set(rawIds)];
    if (unique.length === 0) return [];
    const count = await this.prisma.artist.count({ where: { id: { in: unique } } });
    if (count !== unique.length) {
      throw new BadRequestException('One or more selected artists do not exist');
    }
    return unique;
  }

  private uniqueSlug(title: string, ignoreId?: string) {
    return buildUniqueSlug(
      title,
      async (slug) =>
        (await this.prisma.event.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null,
      ignoreId,
    );
  }
}
