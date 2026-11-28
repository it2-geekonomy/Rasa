import type { SeatAllocation } from "./auditorium-seats";

export type TicketTier = "standard" | "vip" | "accessible";

export const TIER_PRICE_INR: Record<TicketTier, number> = {
  standard: 899,
  vip: 1999,
  accessible: 899,
};

export type PriceBand = {
  id: string;
  label: string;
  rows: readonly string[];
  priceInr: number;
};

export const ROW_PRICE_BANDS: readonly PriceBand[] = [
  { id: "ae", label: "Rows A–E", rows: ["A", "B", "C", "D", "E"], priceInr: 5000 },
  { id: "fj", label: "Rows F–J", rows: ["F", "G", "H", "I", "J"], priceInr: 3000 },
  { id: "kn", label: "Rows K–N", rows: ["K", "L", "M", "N"], priceInr: 2000 },
  { id: "or", label: "Rows O–R", rows: ["O", "P", "Q", "R"], priceInr: 1500 },
  { id: "sw", label: "Rows S–W", rows: ["S", "T", "U", "V", "W"], priceInr: 1000 },
  { id: "xzc", label: "Rows X–ZC", rows: ["X", "Y", "Z", "ZA", "ZB", "ZC"], priceInr: 750 },
];

const PRICE_BY_ROW = new Map<string, number>(
  ROW_PRICE_BANDS.flatMap((b) => b.rows.map((r) => [r, b.priceInr] as const)),
);

export function priceForRow(row: string): number {
  return PRICE_BY_ROW.get(row) ?? TIER_PRICE_INR.standard;
}

export function seatPriceInr(row: string, allocation: SeatAllocation): number {
  if (!tierForAllocation(allocation)) return 0;
  return priceForRow(row);
}

export function tierForAllocation(a: SeatAllocation): TicketTier | null {
  if (a === "vip") return "vip";
  if (a === "wheelchair") return "accessible";
  if (a === "available") return "standard";
  return null;
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export const TIER_LABEL: Record<TicketTier, string> = {
  standard: "Standard",
  vip: "VIP",
  accessible: "Accessible",
};