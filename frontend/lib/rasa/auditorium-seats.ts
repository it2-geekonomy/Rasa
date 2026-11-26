/** Auditorium layout — Left (1–12), Center (13–27), Right (28–39). Stage at bottom. */

export type SeatBlock = "left" | "center" | "right";

export type SeatAllocation =
  | "available"
  | "wheelchair"
  | "missing"
  | "venue"
  | "sur_sandhya"
  | "vip"
  | "console";

export type AuditoriumSeat = {
  row: string;
  col: number;
  block: SeatBlock;
  allocation: SeatAllocation;
  /** Row is in the rear section (behind the aisle). */
  rear: boolean;
};

export const FRONT_ROWS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
] as const;

export const REAR_ROWS = ["S", "T", "U", "V", "W", "X", "Y", "Z", "ZA", "ZB", "ZC"] as const;

export const ALL_ROWS = [...FRONT_ROWS, ...REAR_ROWS] as const;

export function seatBlock(col: number): SeatBlock {
  if (col <= 12) return "left";
  if (col <= 27) return "center";
  return "right";
}

export function seatId(row: string, col: number) {
  return `${row}-${col}`;
}

export function parseSeatId(id: string): { row: string; col: number } {
  const i = id.lastIndexOf("-");
  return { row: id.slice(0, i), col: Number(id.slice(i + 1)) };
}

function isWheelchair(row: string, col: number): boolean {
  if (col <= 12) {
    if (!["A", "S", "ZC"].includes(row)) return false;
    return col === 1 || col === 2 || col === 11 || col === 12;
  }
  if (col >= 28) {
    if (!["A", "S", "ZC"].includes(row)) return false;
    return col === 28 || col === 29 || col === 38 || col === 39;
  }
  return false;
}

function isVenue(row: string, col: number): boolean {
  const ri = FRONT_ROWS.indexOf(row as (typeof FRONT_ROWS)[number]);
  if (ri < 0 || ri > 9) return false;
  if (col >= 17 && col <= 21) return ri <= 4;
  if (col >= 19 && col <= 20) return ri >= 5 && ri <= 9;
  return false;
}

function isSurSandhya(row: string, col: number): boolean {
  const ri = FRONT_ROWS.indexOf(row as (typeof FRONT_ROWS)[number]);
  if (ri < 0) return false;
  if (col >= 4 && col <= 8 && ri >= 3 && ri <= 11) return true;
  if (col >= 32 && col <= 36 && ri >= 3 && ri <= 11) return true;
  if (col >= 14 && col <= 16 && ri >= 4 && ri <= 9) return true;
  if (col >= 24 && col <= 26 && ri >= 6 && ri <= 11) return true;
  return false;
}

function allocationFor(row: string, col: number): SeatAllocation {
  if (row === "ZC" && col >= 13 && col <= 27) return "console";
  if (row === "ZC" && (col === 1 || col === 2)) return "missing";
  if (row === "A" && (col === 20 || col === 21)) return "vip";
  if (isWheelchair(row, col)) return "wheelchair";
  if (isVenue(row, col)) return "venue";
  if (isSurSandhya(row, col)) return "sur_sandhya";
  return "available";
}

function buildSeat(row: string, col: number): AuditoriumSeat {
  const rear = (REAR_ROWS as readonly string[]).includes(row);
  return {
    row,
    col,
    block: seatBlock(col),
    rear,
    allocation: allocationFor(row, col),
  };
}

/** Full house map in row order (rear → front visually top → bottom). */
export function buildAuditoriumSeats(): AuditoriumSeat[] {
  const out: AuditoriumSeat[] = [];
  for (const row of ALL_ROWS) {
    for (let col = 1; col <= 39; col++) {
      out.push(buildSeat(row, col));
    }
  }
  return out;
}

export const AUDITORIUM_SEATS = buildAuditoriumSeats();

export function seatsForBlock(
  seats: AuditoriumSeat[],
  block: SeatBlock,
  rear: boolean,
): AuditoriumSeat[] {
  return seats.filter((s) => s.block === block && s.rear === rear);
}

export function selectableAllocation(a: SeatAllocation) {
  return a === "available" || a === "vip" || a === "wheelchair";
}

export const ALLOCATION_LABEL: Record<SeatAllocation, string> = {
  available: "Available",
  wheelchair: "Wheelchair access",
  missing: "Not a seat",
  venue: "Venue allocation",
  sur_sandhya: "Sur Sandhya allocation",
  vip: "VIP",
  console: "Console",
};