import type { SeatAllocation } from "./auditorium-seats";

export type TicketTier = "standard" | "vip" | "accessible";

export const TIER_PRICE_INR: Record<TicketTier, number> = {
  standard: 899,
  vip: 1999,
  accessible: 899,
};

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