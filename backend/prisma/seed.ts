import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient, Prisma, SeatType, VenueType } from '@prisma/client';
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
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Admin User',
      passwordHash,
    },
  });
  console.log(`Admin ready: ${email}`);
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

async function main() {
  await seedAdmin();
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
