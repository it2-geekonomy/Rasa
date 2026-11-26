/** Festival runs 8–10 January 2027 (local calendar dates). */
export const FESTIVAL_YEAR = 2027;
export const FESTIVAL_START_MONTH = 0; // January
export const FESTIVAL_START_DAY = 8;
export const FESTIVAL_END_DAY = 10;

export type FestivalPhase = "before" | "during" | "after";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from today (local midnight) until festival opening on 8 Jan. Negative once the start has passed. */
export function daysUntilFestivalStart(from: Date = new Date()): number {
  const today = startOfLocalDay(from);
  const start = new Date(FESTIVAL_YEAR, FESTIVAL_START_MONTH, FESTIVAL_START_DAY);
  return Math.round((start.getTime() - today.getTime()) / 864e5);
}

export function festivalPhase(from: Date = new Date()): FestivalPhase {
  const today = startOfLocalDay(from);
  const start = new Date(FESTIVAL_YEAR, FESTIVAL_START_MONTH, FESTIVAL_START_DAY);
  const end = new Date(FESTIVAL_YEAR, FESTIVAL_START_MONTH, FESTIVAL_END_DAY);
  if (today < start) return "before";
  if (today <= end) return "during";
  return "after";
}

export function festivalCountdown(from: Date = new Date()): {
  days: number;
  phase: FestivalPhase;
} {
  return { days: daysUntilFestivalStart(from), phase: festivalPhase(from) };
}

/** @deprecated Use `daysUntilFestivalStart` — kept for existing call sites */
export function countdownDays(): number {
  return daysUntilFestivalStart();
}

export function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return h12 + (mm ? `:${String(mm).padStart(2, "0")}` : "") + ` ${ap}`;
}

export function durMinutes(a: number, b: number): string {
  const d = b - a;
  const h = Math.floor(d / 60);
  const m = d % 60;
  return (
    (h ? h + (h > 1 ? " hrs" : " hr") : "") +
    (h && m ? " " : "") +
    (m ? `${m} min` : "")
  );
}

/** Milliseconds until the next local midnight (when the day count should tick). */
export function msUntilNextLocalMidnight(from: Date = new Date()): number {
  const next = startOfLocalDay(from);
  next.setDate(next.getDate() + 1);
  return Math.max(0, next.getTime() - from.getTime());
}