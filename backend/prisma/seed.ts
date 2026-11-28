import { readFileSync } from 'fs';
import { join } from 'path';
import {
  PrismaClient,
  Prisma,
  SeatType,
  VenueType,
  AllocationOwner,
  EventSeatStatus,
  EventType,
  BookingMode,
} from '@prisma/client';
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
  {
    name: 'Welcome Area',
    venueType: 'GENERAL_ADMISSION',
    description: 'Welcome area for art exhibitions and open gatherings.',
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

    const existingArtist = await prisma.artist.findUnique({
      where: { slug: item.id },
      select: { profileImage: true },
    });
    const keepR2Profile = existingArtist?.profileImage?.startsWith('http')
      ? existingArtist.profileImage
      : profileImage;

    const saved = await prisma.artist.upsert({
      where: { slug: item.id },
      update: {
        name: item.n,
        designation: item.r || null,
        biography,
        profileImage: keepR2Profile,
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
    const fileOf = (url: string) => url.split('/').pop()?.toLowerCase() ?? url.toLowerCase();
    const existingFiles = new Set(existingPhotos.map((p) => fileOf(p.imageUrl)));
    if (profileImage) existingFiles.add(fileOf(profileImage));
    const galleryUrls = [...new Set(resolvedUrls.slice(1))];
    const missing = galleryUrls.filter((url) => !existingFiles.has(fileOf(url)));
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

const AUDITORIUM_ROW_PRICE: Record<string, number> = {};
for (const row of ['A', 'B', 'C', 'D', 'E']) AUDITORIUM_ROW_PRICE[row] = 5000;
for (const row of ['F', 'G', 'H', 'I', 'J']) AUDITORIUM_ROW_PRICE[row] = 3000;
for (const row of ['K', 'L', 'M', 'N']) AUDITORIUM_ROW_PRICE[row] = 2000;
for (const row of ['O', 'P', 'Q', 'R']) AUDITORIUM_ROW_PRICE[row] = 1500;
for (const row of ['S', 'T', 'U', 'V', 'W']) AUDITORIUM_ROW_PRICE[row] = 1000;
for (const row of ['X', 'Y', 'Z', 'ZA', 'ZB', 'ZC']) AUDITORIUM_ROW_PRICE[row] = 750;

function isWebsiteOpenSeat(row: string, seatNumber: number) {
  if (row === 'B' && seatNumber >= 18 && seatNumber <= 29) return true;
  if (row === 'C' && seatNumber >= 7 && seatNumber <= 12) return true;
  if (row === 'D' && seatNumber >= 28 && seatNumber <= 33) return true;
  if (row === 'E') return true;
  if (row === 'P' && (seatNumber <= 12 || seatNumber >= 28)) return true;
  if (row === 'J' && (seatNumber <= 18 || seatNumber >= 21)) return true;
  if (row === 'M' || row === 'U' || row === 'Y') return true;
  return false;
}

async function seedAuditoriumShows(
  auditoriumId: string,
  adminId: string,
  artistsBySlug: Map<string, string>,
) {
  const seats = await prisma.seat.findMany({
    where: { isActive: true, section: { venueId: auditoriumId } },
    select: { id: true, rowLabel: true, seatNumber: true },
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

    const fixedPrice =
      show.slug === 'kathak-and-bharatanatyam' || show.slug === 'dance-alchemy-and-nimishambha'
        ? 250
        : null;

    const already = await prisma.eventSeat.count({ where: { eventSessionId: session.id } });
    if (already > 0) {
      if (fixedPrice !== null) {
        await prisma.eventSession.update({ where: { id: session.id }, data: { price: fixedPrice } });
        await prisma.eventSeat.updateMany({
          where: { eventSessionId: session.id },
          data: { price: fixedPrice },
        });
      }
      console.log(`${show.title} already has ${already} seats`);
      continue;
    }

    const now = new Date();
    if (fixedPrice !== null) {
      await prisma.eventSession.update({ where: { id: session.id }, data: { price: fixedPrice } });
    }
    await prisma.eventSeat.createMany({
      data: seats.map((seat) => ({
        eventSessionId: session.id,
        seatId: seat.id,
        allocationOwner: AllocationOwner.RASA,
        status: isWebsiteOpenSeat(seat.rowLabel, seat.seatNumber)
          ? EventSeatStatus.AVAILABLE
          : EventSeatStatus.BLOCKED,
        price: fixedPrice ?? AUDITORIUM_ROW_PRICE[seat.rowLabel] ?? 0,
        updatedAt: now,
      })),
    });
    console.log(`${show.title} seats created: ${seats.length}`);
  }
}

const WORKSHOPS: Array<{
  slug: string;
  title: string;
  sessionName: string;
  venue: string;
  startAt: string;
  endAt: string;
  price: number;
  slots: number | null;
  eventType: EventType;
  category: string;
  shortDescription: string;
  description: string;
  artistSlugs: string[];
}> = [
  {
    slug: 'inauguration-and-dance',
    title: 'Inauguration and Dance Performances by Upcoming Artists',
    sessionName: 'Friday 4:30 PM',
    venue: 'Amphitheatre',
    startAt: '2027-01-08T11:00:00.000Z',
    endAt: '2027-01-08T12:30:00.000Z',
    price: 0,
    slots: null,
    eventType: 'PERFORMANCE',
    category: 'Performance',
    shortDescription: 'Friday 8 January, 4:30 PM to 6:00 PM, Amphitheatre. Free registration.',
    description:
      'The inauguration of RASA, followed by dance performances by upcoming artists. All are welcome.',
    artistSlugs: [],
  },
  {
    slug: 'tandav-art-show',
    title: 'TANDAV Art Show',
    sessionName: 'Friday · Welcome Area',
    venue: 'Welcome Area',
    startAt: '2027-01-08T11:00:00.000Z',
    endAt: '2027-01-08T16:30:00.000Z',
    price: 0,
    slots: null,
    eventType: 'EXHIBITION',
    category: 'Art',
    shortDescription: 'By Artist Bhagya Ajaikumar. Friday 8 January, Welcome Area. Open for all.',
    description:
      'Abstract prints and sculptures by Artist Bhagya Ajaikumar, bringing together colour, movement and Indian artistic expression. Displayed on Friday, opening day, in the Welcome Area. All are welcome.',
    artistSlugs: ['bhagya'],
  },
  {
    slug: 'swasti-gallery-art-exhibition',
    title: 'Art Exhibition by Swasti Gallery (HCG Foundation)',
    sessionName: 'Saturday 6:00 PM',
    venue: 'Banquet Hall',
    startAt: '2027-01-09T12:30:00.000Z',
    endAt: '2027-01-09T14:30:00.000Z',
    price: 0,
    slots: null,
    eventType: 'EXHIBITION',
    category: 'Art',
    shortDescription: 'Saturday 9 January, 6:00 PM to 8:00 PM, Banquet Hall. Open for all.',
    description:
      'An art exhibition by Swasti Gallery, the art gallery of HCG Foundation, in the Banquet Hall. All are welcome.',
    artistSlugs: [],
  },
  {
    slug: 'talk-active-health-longevity',
    title: 'Talk on Active Health and Longevity',
    sessionName: 'Sunday 8:30 AM',
    venue: 'Amphitheatre',
    startAt: '2027-01-10T03:00:00.000Z',
    endAt: '2027-01-10T04:00:00.000Z',
    price: 0,
    slots: null,
    eventType: 'WELLNESS',
    category: 'Wellness',
    shortDescription: 'With Soul Santé. Sunday 10 January, 8:30 AM to 9:30 AM, Amphitheatre. Open for all.',
    description: 'Talk on Active Health and Longevity with Soul Santé in the Amphitheatre. Open for all.',
    artistSlugs: [],
  },
  {
    slug: 'interactive-discussion-mahabharata',
    title: 'Interactive Discussion on Mahabharata',
    sessionName: 'Sunday 4:30 PM',
    venue: 'Amphitheatre',
    startAt: '2027-01-10T11:00:00.000Z',
    endAt: '2027-01-10T12:30:00.000Z',
    price: 0,
    slots: null,
    eventType: 'PERFORMANCE',
    category: 'Performance',
    shortDescription: 'By Dr B S Ajaikumar. Sunday 10 January, 4:30 PM to 6:00 PM, Amphitheatre. Open for all.',
    description: 'An interactive discussion on the Mahabharata led by Dr B S Ajaikumar. Open for all.',
    artistSlugs: [],
  },
  {
    slug: 'nritya-naada',
    title: 'Nritya Naada',
    sessionName: 'Sunday 6:00 PM',
    venue: 'Amphitheatre',
    startAt: '2027-01-10T12:30:00.000Z',
    endAt: '2027-01-10T13:30:00.000Z',
    price: 0,
    slots: null,
    eventType: 'PERFORMANCE',
    category: 'Performance',
    shortDescription: 'Sumanth, Labonee and Aagnika. Sunday 10 January, 6:00 PM onwards, Amphitheatre. Open for all.',
    description:
      'Nritya Naada brings dance and music together, with Sumanth Manjunath on violin, Labonee Mohanta in Kathak and Aagnika Ajaikumar in Bharatanatyam. Open for all.',
    artistSlugs: ['sumanth', 'labonee', 'aagnika'],
  },
  {
    slug: 'meet-the-rasa-artists',
    title: 'Meet the RASA Artists',
    sessionName: 'Sunday Post-show',
    venue: 'Amphitheatre',
    startAt: '2027-01-10T16:00:00.000Z',
    endAt: '2027-01-10T17:00:00.000Z',
    price: 0,
    slots: null,
    eventType: 'OTHER',
    category: 'Performance',
    shortDescription: 'Sunday 10 January, Post-show. Open for all.',
    description: 'Meet the artists after the show.',
    artistSlugs: [],
  },
  {
    slug: 'organic-food-breakfast',
    title: 'Organic Food Breakfast',
    sessionName: 'Sunday morning',
    venue: 'Amphitheatre',
    startAt: '2027-01-10T04:00:00.000Z',
    endAt: '2027-01-10T06:00:00.000Z',
    price: 0,
    slots: null,
    eventType: 'EXHIBITION',
    category: 'Art and food',
    shortDescription: 'Arogya (HCG). Sunday 10 January, 9:30 AM to 11:30 AM, Amphitheatre.',
    description: 'An organic food breakfast by Arogya, HCG. Price to be announced.',
    artistSlugs: [],
  },
  {
    slug: 'kolu-kalaripayattu',
    title: 'Kolu: Kalaripayattu and Animal Poses',
    sessionName: 'Saturday 10:00 AM',
    venue: 'Banquet Hall',
    startAt: '2027-01-09T04:30:00.000Z',
    endAt: '2027-01-09T07:30:00.000Z',
    price: 899,
    slots: null,
    eventType: 'WORKSHOP',
    category: 'Workshop',
    shortDescription: 'By Mandira (Atha Beyond). Saturday 9 January, 10:00 AM to 1:00 PM, Banquet Hall.',
    description:
      'A three hour hands-on session in Kalaripayattu, one of the oldest martial arts in the world, with Mandira of Atha Beyond. Includes the animal poses (Kolu). Any number of participants.',
    artistSlugs: ['atha'],
  },
  {
    slug: 'salsa-workshop',
    title: 'Salsa Workshop',
    sessionName: 'Saturday 10:00 AM',
    venue: 'Rehearsal Studio',
    startAt: '2027-01-09T04:30:00.000Z',
    endAt: '2027-01-09T05:30:00.000Z',
    price: 999,
    slots: null,
    eventType: 'WORKSHOP',
    category: 'Workshop',
    shortDescription: 'By Lourd Vijay (LVDS). Saturday 9 January, 10:00 AM to 11:00 AM, Rehearsal Studio.',
    description:
      'A one hour So Salsa session led by Lourd Vijay of LVDS. Any number of participants. Take Salsa and Jive together at a lower price.',
    artistSlugs: ['lourd'],
  },
  {
    slug: 'jive-workshop',
    title: 'Jive Workshop',
    sessionName: 'Saturday 11:00 AM',
    venue: 'Rehearsal Studio',
    startAt: '2027-01-09T05:30:00.000Z',
    endAt: '2027-01-09T06:30:00.000Z',
    price: 999,
    slots: null,
    eventType: 'WORKSHOP',
    category: 'Workshop',
    shortDescription: 'By Lourd Vijay (LVDS). Saturday 9 January, 11:00 AM to 12:00 PM, Rehearsal Studio.',
    description:
      'A one hour Jive session led by Lourd Vijay of LVDS. Any number of participants. Take Salsa and Jive together at a lower price.',
    artistSlugs: ['lourd'],
  },
  {
    slug: 'salsa-jive-combo',
    title: 'Salsa & Jive Combo (2 hours)',
    sessionName: 'Saturday 10:00 AM – 12:00 PM',
    venue: 'Rehearsal Studio',
    startAt: '2027-01-09T04:30:00.000Z',
    endAt: '2027-01-09T06:30:00.000Z',
    price: 1499,
    slots: null,
    eventType: 'WORKSHOP',
    category: 'Workshop',
    shortDescription: 'By Lourd Vijay (LVDS). Saturday 9 January, 10:00 AM to 12:00 PM, Rehearsal Studio. Both Salsa and Jive workshops.',
    description:
      'Combined 2-hour ticket for both the Salsa Workshop (10:00–11:00 AM) and Jive Workshop (11:00 AM–12:00 PM) led by Lourd Vijay of LVDS.',
    artistSlugs: ['lourd'],
  },
  {
    slug: 'sound-healing-session-1',
    title: 'Sound Healing Workshop, session 1',
    sessionName: 'Session 1',
    venue: 'Rehearsal Studio',
    startAt: '2027-01-09T06:30:00.000Z',
    endAt: '2027-01-09T07:30:00.000Z',
    price: 999,
    slots: 13,
    eventType: 'WELLNESS',
    category: 'Wellness',
    shortDescription: 'By Siddharth Venkat. Saturday 9 January, 12:00 PM to 1:00 PM, Rehearsal Studio. 13 slots.',
    description:
      'An immersive experience using therapeutic sounds and vibrations to promote relaxation, inner balance and holistic well-being. Siddharth Venkat works with traditional and tribal instruments in sound baths and sound journeys.',
    artistSlugs: ['siddharth'],
  },
  {
    slug: 'sound-healing-session-2',
    title: 'Sound Healing Workshop, session 2',
    sessionName: 'Session 2',
    venue: 'Rehearsal Studio',
    startAt: '2027-01-09T07:30:00.000Z',
    endAt: '2027-01-09T08:30:00.000Z',
    price: 999,
    slots: 12,
    eventType: 'WELLNESS',
    category: 'Wellness',
    shortDescription: 'By Siddharth Venkat. Saturday 9 January, 1:00 PM to 2:00 PM, Rehearsal Studio. 12 slots.',
    description:
      'An immersive experience using therapeutic sounds and vibrations to promote relaxation, inner balance and holistic well-being. The second of two sessions on Saturday.',
    artistSlugs: ['siddharth'],
  },
  {
    slug: 'art-of-drumming',
    title: 'The Art of Drumming',
    sessionName: 'Saturday 2:00 PM',
    venue: 'Rehearsal Studio',
    startAt: '2027-01-09T08:30:00.000Z',
    endAt: '2027-01-09T10:00:00.000Z',
    price: 599,
    slots: 30,
    eventType: 'WORKSHOP',
    category: 'Workshop',
    shortDescription: 'By Banjo Rancho. Saturday 9 January, 2:00 PM to 3:30 PM, Rehearsal Studio. 30 slots.',
    description:
      'Exploring rhythm, creativity and possibilities of the drum set. Open to everyone. No previous experience is necessary.',
    artistSlugs: ['banjo'],
  },
  {
    slug: 'yoga-raaga',
    title: 'Yoga Raaga',
    sessionName: 'Saturday 2:00 PM',
    venue: 'Banquet Hall',
    startAt: '2027-01-09T08:30:00.000Z',
    endAt: '2027-01-09T10:30:00.000Z',
    price: 999,
    slots: null,
    eventType: 'WELLNESS',
    category: 'Wellness',
    shortDescription: 'By Dr. Vinaya Nair and Sumanth Manjunath. Saturday 9 January, 2:00 PM to 4:00 PM, Banquet Hall.',
    description: 'Yoga Raaga: Ancient Raagas for the Inner Harmony. Any number of participants.',
    artistSlugs: ['vinaya', 'sumanth'],
  },
  {
    slug: 'dance-fitness',
    title: 'Dance Fitness Marathon',
    sessionName: 'Sunday 7:00 AM (7:30 – 8:30 AM)',
    venue: 'Amphitheatre',
    startAt: '2027-01-10T01:30:00.000Z',
    endAt: '2027-01-10T03:00:00.000Z',
    price: 499,
    slots: null,
    eventType: 'WELLNESS',
    category: 'Wellness',
    shortDescription: 'Sunday 10 January, 7:00 AM reporting (7:30 to 8:30 AM), Amphitheatre. ₹499 per person.',
    description:
      'Join us for an energetic 75-minute Dance Fitness session led by three amazing trainers, featuring a power-packed mix of trending Bollywood and regional tracks. 7:00 AM reporting; 7:30 to 8:30 AM Dance Fitness Marathon.',
    artistSlugs: [],
  },
  {
    slug: 'meipadam-workshop',
    title: 'Meipadam Workshop',
    sessionName: 'Sunday 10:00 AM',
    venue: 'Rehearsal Studio',
    startAt: '2027-01-10T04:30:00.000Z',
    endAt: '2027-01-10T06:00:00.000Z',
    price: 499,
    slots: null,
    eventType: 'WORKSHOP',
    category: 'Workshop',
    shortDescription: 'By Vijayalakshmi Somashekarappa. Sunday 10 January, 10:00 AM to 11:30 AM, Rehearsal Studio.',
    description:
      'Meipadam, an Indian martial art whose name means body art in Tamil, led by Vijayalakshmi Somashekarappa, certified Meipadam and Karlakattai coach. Any number of participants.',
    artistSlugs: ['vijay'],
  },
  {
    slug: 'bharatanatyam-dikshitar-kriti',
    title: 'Bharatanatyam Workshop: Dikshitar Kriti',
    sessionName: 'Sunday 11:30 AM',
    venue: 'Rehearsal Studio',
    startAt: '2027-01-10T06:00:00.000Z',
    endAt: '2027-01-10T09:00:00.000Z',
    price: 2500,
    slots: null,
    eventType: 'WORKSHOP',
    category: 'Workshop',
    shortDescription: 'By Guru Smt. Anuradha Sridhar. Sunday 10 January, 11:30 AM to 2:30 PM, Rehearsal Studio.',
    description:
      'A three hour Bharatanatyam workshop on a Dikshitar kriti, led by Guru Smt. Anuradha Sridhar. Prerequisite: Senior exam passed.',
    artistSlugs: ['anuradha'],
  },
  {
    slug: 'carving-rhythm-linocut',
    title: 'Carving Rhythm – Linocut Printmaking Workshop',
    sessionName: 'Sunday 2:30 PM',
    venue: 'Rehearsal Studio',
    startAt: '2027-01-10T09:00:00.000Z',
    endAt: '2027-01-10T11:30:00.000Z',
    price: 1200,
    slots: 10,
    eventType: 'WORKSHOP',
    category: 'Workshop',
    shortDescription: 'By Artist Bhagya Ajaikumar. Sunday 10 January, 2:30 PM to 5:00 PM, Rehearsal Studio. 10 slots.',
    description:
      'Discover the art of linocut printmaking in this hands-on creative workshop. Drawing inspiration from classical Indian dance mudras, rhythmic percussion patterns and traditional temple architecture, participants will sketch, carve and print their own unique designs. Age 18 and over. Duration 2.5 hours. No prior printmaking experience required.',
    artistSlugs: ['bhagya'],
  },
  {
    slug: 'fusion-culinary-exploration',
    title: 'Fusion Culinary Exploration',
    sessionName: 'Sunday 4:00 PM',
    venue: 'Banquet Hall',
    startAt: '2027-01-10T10:30:00.000Z',
    endAt: '2027-01-10T12:30:00.000Z',
    price: 2499,
    slots: null,
    eventType: 'OTHER',
    category: 'Food',
    shortDescription: 'By Culinary Designer Shruthi Agarwal. Sunday 10 January, 4:00 PM to 6:00 PM, Banquet Hall. ₹2,499 per person.',
    description:
      'Experience an exploration of Nine Rasas and the emotions of Bharatanatyam through a sensory and culinary installation, conceived by Shruti Agarwal, accompanied by Bharatanatyam artists.',
    artistSlugs: ['shruthi'],
  },
];

async function seedWorkshops(
  venues: Map<string, string>,
  adminId: string,
  artistsBySlug: Map<string, string>,
) {
  for (const workshop of WORKSHOPS) {
    const venueId = venues.get(workshop.venue);
    if (!venueId) {
      throw new Error(`Venue not found: ${workshop.venue}`);
    }
    const bookingMode: BookingMode =
      workshop.price > 0 || workshop.slots != null ? 'CAPACITY_BASED' : 'FREE_ENTRY';
    const event = await prisma.event.upsert({
      where: { slug: workshop.slug },
      update: {
        title: workshop.title,
        category: workshop.category,
        eventType: workshop.eventType,
        bookingMode,
        status: 'PUBLISHED',
        shortDescription: workshop.shortDescription,
        description: workshop.description,
      },
      create: {
        title: workshop.title,
        slug: workshop.slug,
        category: workshop.category,
        eventType: workshop.eventType,
        bookingMode,
        status: 'PUBLISHED',
        shortDescription: workshop.shortDescription,
        description: workshop.description,
        createdBy: adminId,
      },
    });

    for (let index = 0; index < workshop.artistSlugs.length; index += 1) {
      const artistId = artistsBySlug.get(workshop.artistSlugs[index]);
      if (!artistId) continue;
      await prisma.eventArtist.upsert({
        where: { eventId_artistId: { eventId: event.id, artistId } },
        update: { sortOrder: index },
        create: { eventId: event.id, artistId, sortOrder: index },
      });
    }

    const startAt = new Date(workshop.startAt);
    const existing = await prisma.eventSession.findFirst({
      where: { eventId: event.id },
      orderBy: { startAt: 'asc' },
    });
    const data = {
      venueId,
      sessionName: workshop.sessionName,
      startAt,
      endAt: new Date(workshop.endAt),
      capacity: workshop.slots,
      price: workshop.price,
      status: 'SCHEDULED' as const,
    };
    if (existing) {
      await prisma.eventSession.update({ where: { id: existing.id }, data });
    } else {
      await prisma.eventSession.create({
        data: { eventId: event.id, ...data },
      });
    }
    console.log(
      `${workshop.title}: ${workshop.venue}, ₹${workshop.price}, ${workshop.slots == null ? 'no slot cap' : `${workshop.slots} slots`}`,
    );
  }
}

const DEFAULT_EVENT_BANNERS: Record<string, string> = {
  // Auditorium shows
  'three-forces-agam-band': '/images/poster-fri1.jpg',
  'kathak-and-bharatanatyam': '/images/lab-pink.jpg',
  'dance-alchemy-and-nimishambha': '/images/lourd-smile.jpg',
  'fusion-express': '/images/poster-fusion.jpg',
  'warriors-path-and-mahabharata': '/images/atha-4.jpg',
  // Workshops (exact posters from events.json)
  'kolu-kalaripayattu': '/images/Kalaripayatu-01.jpg',
  'salsa-workshop': '/images/Salsa-01.jpg',
  'jive-workshop': '/images/Jive-01.jpg',
  'salsa-jive-combo': '/images/Salsa-01.jpg',
  'sound-healing-session-1': '/images/Sound Healing-01.jpg',
  'sound-healing-session-2': '/images/Sound Healing-01.jpg',
  'art-of-drumming': '/images/Art of Drumming-01.jpg',
  'yoga-raaga': '/images/Yoga Raaga-01.jpg',
  'meipadam-workshop': '/images/Meipadam-02-01.jpg',
  'bharatanatyam-dikshitar-kriti': '/images/Bharatanatyam-01.jpg',
  'carving-rhythm-linocut': '/images/Linocut_-03.jpg',
  'fusion-culinary-exploration': '/images/Fusion Culinary.jpg',
  // Open-for-all events with linked artists
  'tandav-art-show': '/images/bhagya-ws.jpg',
  'nritya-naada': '/images/sumanth-us.jpg',
};

async function seedEventBanners() {
  let updated = 0;
  for (const [slug, bannerImage] of Object.entries(DEFAULT_EVENT_BANNERS)) {
    const res = await prisma.event.updateMany({
      where: { slug, bannerImage: null },
      data: { bannerImage },
    });
    updated += res.count;
  }
  console.log(`Event banners backfilled (only where empty): ${updated}`);
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
  await seedWorkshops(venues, adminId, artistsBySlug);
  await seedEventBanners();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
