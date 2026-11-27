import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient, Prisma, SeatType, VenueType, AllocationOwner, EventSeatStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type LayoutSeat = {
  sectionCode: string;
  rowLabel: string;
  seatNumber: number;
  seatLabel: string;
  seatType: SeatType;
  xPosition: number;
  yPosition: number;
};

const VENUES: Array<{
  name: string;
  venueType: VenueType;
  description: string;
  totalCapacity: number | null;
}> = [
  {
    name: 'Auditorium',
    venueType: 'RESERVED_SEATING',
    description:
      'Reserved-seating auditorium. One physical layout is reused for every auditorium session.',
    totalCapacity: 1075,
  },
  {
    name: 'Amphitheatre',
    venueType: 'GENERAL_ADMISSION',
    description: 'Open-air amphitheatre.',
    totalCapacity: null,
  },
  {
    name: 'Rehearsal Studio',
    venueType: 'GENERAL_ADMISSION',
    description: 'Rehearsal studio for workshops and smaller sessions.',
    totalCapacity: null,
  },
  {
    name: 'Banquet Hall',
    venueType: 'GENERAL_ADMISSION',
    description: 'Banquet hall for workshops and gatherings.',
    totalCapacity: null,
  },
];

const AUDITORIUM_SECTIONS: Array<{
  sectionCode: string;
  sectionName: string;
  displayOrder: number;
  layoutMetadata: Prisma.InputJsonValue;
}> = [
  {
    sectionCode: 'UL',
    sectionName: 'Upper Left',
    displayOrder: 1,
    layoutMetadata: { regularSeats: 114, wheelchairSeats: 4, missingSeatsExcluded: 2 },
  },
  {
    sectionCode: 'UC',
    sectionName: 'Upper Centre',
    displayOrder: 2,
    layoutMetadata: { regularSeats: 135, wheelchairSeats: 0, missingSeatsExcluded: 0 },
  },
  {
    sectionCode: 'UR',
    sectionName: 'Upper Right',
    displayOrder: 3,
    layoutMetadata: { regularSeats: 116, wheelchairSeats: 4, missingSeatsExcluded: 0 },
  },
  {
    sectionCode: 'LL',
    sectionName: 'Lower Left',
    displayOrder: 4,
    layoutMetadata: { regularSeats: 212, wheelchairSeats: 4, missingSeatsExcluded: 0 },
  },
  {
    sectionCode: 'LC',
    sectionName: 'Lower Centre',
    displayOrder: 5,
    layoutMetadata: { regularSeats: 270, wheelchairSeats: 0, missingSeatsExcluded: 0 },
  },
  {
    sectionCode: 'LR',
    sectionName: 'Lower Right',
    displayOrder: 6,
    layoutMetadata: { regularSeats: 212, wheelchairSeats: 4, missingSeatsExcluded: 0 },
  },
];

function loadAuditoriumSeats(): LayoutSeat[] {
  const path = join(__dirname, 'data', 'auditorium-seats.json');
  return JSON.parse(readFileSync(path, 'utf8')) as LayoutSeat[];
}

async function seedAdmin() {
  const email = 'admin@rasafest.org';
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Admin User',
      passwordHash,
    },
  });
  console.log(`Admin ready: ${email}`);
  return admin.id;
}

async function seedVenues() {
  const byName = new Map<string, string>();
  for (const venue of VENUES) {
    const saved = await prisma.venue.upsert({
      where: { name: venue.name },
      update: {
        venueType: venue.venueType,
        description: venue.description,
        totalCapacity: venue.totalCapacity,
        isActive: true,
      },
      create: venue,
    });
    byName.set(saved.name, saved.id);
  }
  console.log(`Venues ready: ${VENUES.length}`);
  return byName;
}

async function seedAuditorium(auditoriumId: string, seats: LayoutSeat[]) {
  const sectionIds = new Map<string, string>();
  for (const section of AUDITORIUM_SECTIONS) {
    const saved = await prisma.seatingSection.upsert({
      where: {
        venueId_sectionCode: {
          venueId: auditoriumId,
          sectionCode: section.sectionCode,
        },
      },
      update: {
        sectionName: section.sectionName,
        displayOrder: section.displayOrder,
        layoutMetadata: section.layoutMetadata,
      },
      create: {
        venueId: auditoriumId,
        ...section,
      },
    });
    sectionIds.set(section.sectionCode, saved.id);
  }

  let created = 0;
  let updated = 0;
  for (const [sectionCode, sectionId] of sectionIds) {
    const layout = seats.filter((seat) => seat.sectionCode === sectionCode);
    const existing = await prisma.seat.findMany({
      where: { sectionId },
      select: {
        id: true,
        rowLabel: true,
        seatNumber: true,
        seatLabel: true,
        seatType: true,
        xPosition: true,
        yPosition: true,
        isActive: true,
      },
    });
    const existingByKey = new Map(
      existing.map((seat) => [`${seat.rowLabel}:${seat.seatNumber}`, seat]),
    );

    const toCreate: Prisma.SeatCreateManyInput[] = [];
    for (const seat of layout) {
      const current = existingByKey.get(`${seat.rowLabel}:${seat.seatNumber}`);
      if (!current) {
        toCreate.push({
          sectionId,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          seatLabel: seat.seatLabel,
          seatType: seat.seatType,
          xPosition: seat.xPosition,
          yPosition: seat.yPosition,
          isActive: true,
        });
        continue;
      }
      const changed =
        current.seatLabel !== seat.seatLabel ||
        current.seatType !== seat.seatType ||
        current.xPosition !== seat.xPosition ||
        current.yPosition !== seat.yPosition ||
        current.isActive !== true;
      if (changed) {
        await prisma.seat.update({
          where: { id: current.id },
          data: {
            seatLabel: seat.seatLabel,
            seatType: seat.seatType,
            xPosition: seat.xPosition,
            yPosition: seat.yPosition,
            isActive: true,
          },
        });
        updated += 1;
      }
    }

    if (toCreate.length > 0) {
      await prisma.seat.createMany({ data: toCreate });
      created += toCreate.length;
    }
  }

  console.log(`Auditorium seats created: ${created}, updated: ${updated}`);
}

async function reportAuditorium() {
  const rows = await prisma.seat.groupBy({
    by: ['sectionId', 'seatType'],
    _count: { _all: true },
  });
  const sections = await prisma.seatingSection.findMany({
    select: { id: true, sectionCode: true, sectionName: true },
    orderBy: { displayOrder: 'asc' },
  });
  console.log('Seat counts by section:');
  for (const section of sections) {
    const normal =
      rows.find((row) => row.sectionId === section.id && row.seatType === 'NORMAL')?._count
        ._all ?? 0;
    const wheelchair =
      rows.find((row) => row.sectionId === section.id && row.seatType === 'WHEELCHAIR')?._count
        ._all ?? 0;
    console.log(
      `  ${section.sectionCode} ${section.sectionName}: ${normal} regular, ${wheelchair} wheelchair, ${normal + wheelchair} total`,
    );
  }
  const total = rows.reduce((sum, row) => sum + row._count._all, 0);
  const wheelchair = rows
    .filter((row) => row.seatType === 'WHEELCHAIR')
    .reduce((sum, row) => sum + row._count._all, 0);
  console.log(`Auditorium seats total: ${total} (${wheelchair} wheelchair)`);
  if (total !== 1075 || wheelchair !== 16) {
    throw new Error(`Unexpected seat totals: ${total} seats, ${wheelchair} wheelchair`);
  }
}

type WebsiteArtist = {
  id: string;
  n: string;
  r: string;
  c: string;
  img: string[];
  bio: string[];
  ct?: {
    ig?: string;
    ig2?: string;
    web?: string;
    ph?: string;
    phl?: string;
    em?: string;
  };
  cred?: string;
};

function loadWebsiteArtists(): WebsiteArtist[] {
  const path = join(__dirname, '..', '..', 'frontend', 'public', 'data', 'artists.json');
  return JSON.parse(readFileSync(path, 'utf8')) as WebsiteArtist[];
}

function loadImageMap(): Record<string, string> {
  const path = join(__dirname, '..', '..', 'frontend', 'lib', 'rasa', 'img-map.ts');
  const raw = readFileSync(path, 'utf8');
  const map: Record<string, string> = {};
  for (const match of raw.matchAll(/"([^"]+)":"([^"]+)"/g)) {
    map[match[1]] = match[2];
  }
  return map;
}

const AUDITORIUM_SHOWS: Array<{
  slug: string;
  title: string;
  sessionName: string;
  startAt: string;
  endAt: string;
  shortDescription: string;
  description: string;
  artistSlugs: string[];
}> = [
  {
    slug: 'three-forces-agam-band',
    title: 'Three Forces, One Stage, then Agam Band',
    sessionName: 'Friday evening',
    startAt: '2027-01-08T13:00:00.000Z',
    endAt: '2027-01-08T16:30:00.000Z',
    shortDescription:
      'Friday 8 January, 6:30 PM to 10:00 PM in the Auditorium. One ticket includes both shows.',
    description:
      'Three Forces, One Stage, 6:30 to 7:30 PM: Harish Sivaramakrishnan, Sumanth Manjunath and Banjo Rancho. Then Agam Band, 7:30 PM onwards. One ticket includes both shows. The spreadsheet has no ticket price yet, so every seat stays blocked until an admin opens it.',
    artistSlugs: ['harish', 'sumanth', 'banjo', 'agam'],
  },
  {
    slug: 'kathak-and-bharatanatyam',
    title: 'A Kathak Performance, then Khechara Academy of Bharatanatyam',
    sessionName: 'Saturday afternoon',
    startAt: '2027-01-09T10:00:00.000Z',
    endAt: '2027-01-09T12:15:00.000Z',
    shortDescription:
      'Saturday 9 January, 3:30 PM to 5:45 PM in the Auditorium. One ticket includes both shows.',
    description:
      '3:30 to 4:30 PM: A Kathak Performance by Labonee Mohanta. 4:30 to 5:45 PM: Khechara Academy of Bharatanatyam, Anuradha Sridhar. One ticket includes both shows. The spreadsheet has no ticket price yet, so every seat stays blocked until an admin opens it.',
    artistSlugs: ['labonee', 'anuradha'],
  },
  {
    slug: 'dance-alchemy-and-nimishambha',
    title: 'Dance Alchemy, then Sri Nimishambha School of Dance',
    sessionName: 'Saturday early evening',
    startAt: '2027-01-09T12:15:00.000Z',
    endAt: '2027-01-09T14:05:00.000Z',
    shortDescription:
      'Saturday 9 January, 5:45 PM to 7:35 PM in the Auditorium. One ticket includes both shows.',
    description:
      '5:45 to 6:20 PM: Dance Alchemy by LVDS, Lourd Vijay Dance Studio. 6:20 to 7:35 PM: Sri Nimishambha School of Dance, Mysuru. One ticket includes both shows. The spreadsheet has no ticket price yet, so every seat stays blocked until an admin opens it.',
    artistSlugs: ['lourd', 'nimishambha'],
  },
  {
    slug: 'fusion-express',
    title: 'Fusion Express',
    sessionName: 'Saturday night',
    startAt: '2027-01-09T14:15:00.000Z',
    endAt: '2027-01-09T16:30:00.000Z',
    shortDescription:
      'Saturday 9 January, 7:45 PM to 10:00 PM in the Auditorium. The sheet says this ticket also covers the other ticketed shows that day.',
    description:
      'Fusion Express, 7:45 PM onwards: Bickram Ghosh, Ghatam Giridhar Udupa, Sumanth Manjunath, Venkatraman S, Banjo Rancho, Ned McGowan and Quinten Rutgers. Mysore Manjunath joins for the last 30 minutes. The spreadsheet says one ticket grants access to the other ticketed events that day, and it has no ticket price yet, so every seat stays blocked until an admin opens it.',
    artistSlugs: [
      'bickram',
      'sumanth',
      'venkat',
      'ghatam',
      'banjo',
      'ned',
      'quinten',
      'mysoremanjunath',
    ],
  },
  {
    slug: 'warriors-path-and-mahabharata',
    title: "The Warrior's Path, then Mahabharata: A Mirror to Humanity",
    sessionName: 'Sunday evening',
    startAt: '2027-01-10T13:30:00.000Z',
    endAt: '2027-01-10T16:00:00.000Z',
    shortDescription:
      'Sunday 10 January, 7:00 PM to 9:30 PM in the Auditorium. One ticket includes both shows, with no break between them.',
    description:
      "7:00 to 7:30 PM: The Warrior's Path, a Kalaripayattu performance by Atha Beyond. It continues straight into Mahabharata: A Mirror to Humanity: The Dilemma of Dharma, 7:30 to 9:30 PM, with Mallika Sarabhai, Dr. Lakshminarayan, Dr. Vasanth Kiran and Vyjayanthi Kashi. One ticket includes both shows. The spreadsheet has no ticket price yet, so every seat stays blocked until an admin opens it.",
    artistSlugs: ['atha', 'mallika', 'jena', 'vasanth', 'vyjayanthi'],
  },
];

async function seedArtists() {
  const artists = loadWebsiteArtists();
  const imageMap = loadImageMap();
  const bySlug = new Map<string, string>();
  let photoCount = 0;

  for (const item of artists) {
    const resolvedUrls = item.img
      .map((key) => imageMap[key])
      .filter((url): url is string => Boolean(url));

    const profileImage = resolvedUrls[0] ?? null;
    const biography = item.bio.join('\n\n') || null;
    const socialLinks: Prisma.InputJsonValue = {
      ...(item.ct ?? {}),
      category: item.c,
      ...(item.cred ? { credit: item.cred } : {}),
    };

    const saved = await prisma.artist.upsert({
      where: { slug: item.id },
      update: {
        name: item.n,
        designation: item.r || null,
        biography,
        profileImage,
        socialLinks,
        isActive: true,
      },
      create: {
        name: item.n,
        slug: item.id,
        designation: item.r || null,
        biography,
        profileImage,
        socialLinks,
        isActive: true,
      },
    });
    bySlug.set(saved.slug, saved.id);

    const existingPhotos = await prisma.artistPhoto.findMany({
      where: { artistId: saved.id },
      select: { imageUrl: true },
    });
    const existingSet = new Set(existingPhotos.map((p) => p.imageUrl));
    const missing = resolvedUrls.filter((url) => !existingSet.has(url));
    if (missing.length > 0) {
      await prisma.artistPhoto.createMany({
        data: missing.map((imageUrl) => ({ artistId: saved.id, imageUrl })),
      });
      photoCount += missing.length;
    }
  }

  console.log(`Artists ready: ${artists.length} (${photoCount} new gallery photos added)`);
  return bySlug;
}

async function seedAuditoriumShows(
  auditoriumId: string,
  adminId: string,
  artistsBySlug: Map<string, string>,
) {
  const seats = await prisma.seat.findMany({
    where: { isActive: true, section: { venueId: auditoriumId } },
    select: { id: true },
  });

  for (const show of AUDITORIUM_SHOWS) {
    const event = await prisma.event.upsert({
      where: { slug: show.slug },
      update: {
        title: show.title,
        category: 'Performance',
        eventType: 'PERFORMANCE',
        bookingMode: 'SEAT_BASED',
        status: 'PUBLISHED',
        shortDescription: show.shortDescription,
        description: show.description,
      },
      create: {
        title: show.title,
        slug: show.slug,
        category: 'Performance',
        eventType: 'PERFORMANCE',
        bookingMode: 'SEAT_BASED',
        status: 'PUBLISHED',
        shortDescription: show.shortDescription,
        description: show.description,
        createdBy: adminId,
      },
    });

    for (let index = 0; index < show.artistSlugs.length; index += 1) {
      const artistId = artistsBySlug.get(show.artistSlugs[index]);
      if (!artistId) continue;
      await prisma.eventArtist.upsert({
        where: {
          eventId_artistId: {
            eventId: event.id,
            artistId,
          },
        },
        update: { sortOrder: index },
        create: {
          eventId: event.id,
          artistId,
          sortOrder: index,
        },
      });
    }

    const startAt = new Date(show.startAt);
    const endAt = new Date(show.endAt);
    const existing = await prisma.eventSession.findFirst({
      where: { eventId: event.id, startAt },
    });
    const session =
      existing ??
      (await prisma.eventSession.create({
        data: {
          eventId: event.id,
          venueId: auditoriumId,
          sessionName: show.sessionName,
          startAt,
          endAt,
          price: 0,
          status: 'SCHEDULED',
        },
      }));

    const already = await prisma.eventSeat.count({ where: { eventSessionId: session.id } });
    if (already > 0) {
      console.log(`${show.title} already has ${already} seats`);
      continue;
    }

    const now = new Date();
    await prisma.eventSeat.createMany({
      data: seats.map((seat) => ({
        eventSessionId: session.id,
        seatId: seat.id,
        allocationOwner: AllocationOwner.RASA,
        status: EventSeatStatus.BLOCKED,
        price: 0,
        updatedAt: now,
      })),
    });
    console.log(`${show.title} seats created: ${seats.length}`);
  }
}

async function main() {
  const adminId = await seedAdmin();
  const venues = await seedVenues();
  const auditoriumId = venues.get('Auditorium');
  if (!auditoriumId) {
    throw new Error('Auditorium venue was not created');
  }
  const seats = loadAuditoriumSeats();
  if (seats.length !== 1075) {
    throw new Error(`Seat file has ${seats.length} rows; expected 1075`);
  }
  await seedAuditorium(auditoriumId, seats);
  await reportAuditorium();
  const artistsBySlug = await seedArtists();
  await seedAuditoriumShows(auditoriumId, adminId, artistsBySlug);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
