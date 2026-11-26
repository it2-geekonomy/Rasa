import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageArgs, pageMeta } from '../../common/utils/pagination';
import { rethrowPrisma } from '../../common/utils/prisma-error';
import { buildUniqueSlug } from '../../common/utils/slug';
import { CreateArtistDto, ListArtistsQueryDto, UpdateArtistDto } from './dto/artist.dto';

const artistSelect = {
  id: true,
  name: true,
  slug: true,
  designation: true,
  biography: true,
  profileImage: true,
  socialLinks: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  photos: {
    orderBy: { createdAt: 'asc' },
    select: { id: true, imageUrl: true, createdAt: true },
  },
  _count: { select: { events: true, photos: true } },
} satisfies Prisma.ArtistSelect;

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArtistDto) {
    const slug = dto.slug?.trim()
      ? dto.slug.trim()
      : await this.uniqueSlug(dto.name);
    const photoUrls = (dto.photoUrls ?? []).map((u) => u.trim()).filter(Boolean);

    try {
      return await this.prisma.artist.create({
        data: {
          name: dto.name.trim(),
          slug,
          designation: dto.designation?.trim() || null,
          biography: dto.biography?.trim() || null,
          profileImage: dto.profileImage?.trim() || null,
          socialLinks: dto.socialLinks as Prisma.InputJsonValue | undefined,
          isActive: dto.isActive ?? true,
          ...(photoUrls.length > 0
            ? {
                photos: {
                  create: photoUrls.map((imageUrl) => ({ imageUrl })),
                },
              }
            : {}),
        },
        select: artistSelect,
      });
    } catch (error) {
      rethrowPrisma(error, { unique: 'An artist with this slug already exists' });
    }
  }

  async findAll(query: ListArtistsQueryDto) {
    const { page, limit, skip, take } = pageArgs(query.page, query.limit);
    const where: Prisma.ArtistWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: 'insensitive' } },
              { designation: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: artistSelect,
      }),
      this.prisma.artist.count({ where }),
    ]);
    return { data, meta: pageMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { createdAt: 'asc' } },
        events: {
          orderBy: { sortOrder: 'asc' },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                slug: true,
                category: true,
                eventType: true,
                bookingMode: true,
                status: true,
                bannerImage: true,
              },
            },
          },
        },
      },
    });
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
    return artist;
  }

  async update(id: string, dto: UpdateArtistDto) {
    const existing = await this.prisma.artist.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existing) {
      throw new NotFoundException('Artist not found');
    }

    let slug = dto.slug?.trim();
    if (dto.slug !== undefined && !slug) {
      slug = await this.uniqueSlug(dto.name ?? existing.name, id);
    }

    const photoUrls =
      dto.photoUrls !== undefined
        ? dto.photoUrls.map((u) => u.trim()).filter(Boolean)
        : undefined;

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (photoUrls !== undefined) {
          await tx.artistPhoto.deleteMany({ where: { artistId: id } });
          if (photoUrls.length > 0) {
            await tx.artistPhoto.createMany({
              data: photoUrls.map((imageUrl) => ({ artistId: id, imageUrl })),
            });
          }
        }
        return tx.artist.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            slug,
            designation: dto.designation !== undefined ? dto.designation.trim() || null : undefined,
            biography: dto.biography !== undefined ? dto.biography.trim() || null : undefined,
            profileImage:
              dto.profileImage !== undefined ? dto.profileImage.trim() || null : undefined,
            socialLinks:
              dto.socialLinks !== undefined
                ? (dto.socialLinks as Prisma.InputJsonValue)
                : undefined,
            isActive: dto.isActive,
          },
          select: artistSelect,
        });
      });
    } catch (error) {
      rethrowPrisma(error, { unique: 'An artist with this slug already exists' });
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.artist.delete({ where: { id } });
    return { id };
  }

  private uniqueSlug(name: string, ignoreId?: string) {
    return buildUniqueSlug(
      name,
      async (slug) =>
        (await this.prisma.artist.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null,
      ignoreId,
    );
  }
}
