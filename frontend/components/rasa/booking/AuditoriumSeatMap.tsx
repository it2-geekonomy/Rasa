"use client";

import { useMemo, type ReactNode } from "react";
import {
  AUDITORIUM_SEATS,
  ALLOCATION_LABEL,
  FRONT_ROWS,
  REAR_ROWS,
  seatId,
  seatsForBlock,
  selectableAllocation,
  type SeatAllocation,
  type SeatBlock,
} from "@/lib/rasa/auditorium-seats";
import { formatInr, TIER_LABEL, TIER_PRICE_INR, tierForAllocation } from "@/lib/rasa/booking-pricing";
import { SeatMapViewport } from "./SeatMapViewport";

const BLOCKS: { id: SeatBlock; label: string; colStart: number; colEnd: number }[] = [
  { id: "left", label: "Seats 1–12", colStart: 1, colEnd: 12 },
  { id: "center", label: "Seats 13–27", colStart: 13, colEnd: 27 },
  { id: "right", label: "Seats 28–39", colStart: 28, colEnd: 39 },
];

const ALLOC_BASE: Record<SeatAllocation, string> = {
  available:
    "border-2 border-[#cdb9cf] bg-white text-ink hover:border-plum hover:bg-tint hover:shadow-sm",
  vip: "border-2 border-sky-400 bg-sky-50 text-sky-950 hover:border-plum",
  wheelchair: "border-2 border-amber-400 bg-amber-50 text-amber-950 hover:border-plum",
  venue: "border-2 border-emerald-500/90 bg-emerald-100 text-emerald-950 cursor-not-allowed",
  sur_sandhya: "border-2 border-zinc-400 bg-zinc-200 text-zinc-700 cursor-not-allowed",
  missing: "border-2 border-dashed border-red-200 bg-red-50/50 cursor-not-allowed opacity-50",
  console: "border-0 bg-orange-200 cursor-not-allowed",
};

const SELECTED =
  "border-2 border-burg bg-burg text-white font-bold shadow-[0_2px_6px_rgba(147,25,41,.35)]";

/** Below lg: readable tiles + zoom; lg+: compact single-view desktop layout. */
const SEAT_CELL =
  "size-5 min-h-9 min-w-9 max-lg:border-2 max-lg:p-0 max-lg:font-lab max-lg:text-[10px] max-lg:font-bold max-lg:leading-none max-lg:tracking-tight lg:size-[18px] lg:min-h-0 lg:min-w-0 lg:border-2 lg:text-[8px] xl:size-5 xl:text-[9px] 2xl:size-[22px] 2xl:text-[10px]";
const SEAT_NUM = "pointer-events-none tabular-nums max-lg:text-[11px] max-lg:font-bold max-lg:leading-none";
const COL_W = "w-5 lg:w-[18px] xl:w-5 2xl:w-[22px]";
const ROW_LABEL =
  "w-6 shrink-0 text-[10px] font-bold text-ink max-lg:font-lab lg:w-7 lg:text-[10px] xl:w-8 2xl:w-9";

const LEGEND_SHORT: Record<SeatAllocation, string> = {
  available: "Open",
  vip: "VIP",
  wheelchair: "Access",
  venue: "Venue",
  sur_sandhya: "Held",
  missing: "N/A",
  console: "Console",
};

const LEGEND_SWATCH: Record<SeatAllocation, string> = {
  available: "border-2 border-[#cdb9cf] bg-white",
  vip: "border-2 border-sky-400 bg-sky-50",
  wheelchair: "border-2 border-amber-400 bg-amber-50",
  venue: "border-2 border-emerald-400 bg-emerald-100",
  sur_sandhya: "border-2 border-zinc-300 bg-zinc-200",
  missing: "border-2 border-dashed border-red-200 bg-red-50",
  console: "bg-orange-200",
};

export type LiveSeat = {
  eventSeatId: string;
  bookable: boolean;
  status: string;
  seatType: string;
};

type Props = {
  selected: Set<string>;
  onToggle: (id: string) => void;
  lockedIds?: Set<string>;
  /** Programme sheet: map fills height; hide duplicate summary under map. */
  variant?: "default" | "sheet";
  /** Live inventory keyed by row-seat, for example A-12. */
  live?: Map<string, LiveSeat>;
};

export function AuditoriumSeatMap({
  selected,
  onToggle,
  lockedIds,
  variant = "default",
  live,
}: Props) {
  const locked = lockedIds ?? new Set<string>();

  const consoleSpan = useMemo(() => {
    const c = AUDITORIUM_SEATS.find((s) => s.allocation === "console");
    return c?.row ?? "ZC";
  }, []);

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col ${
        variant === "sheet" ? "h-full min-h-0 flex-1 gap-1" : "space-y-3 max-lg:gap-1.5 max-lg:space-y-1.5"
      }`}
    >
      {live ? <LiveLegend compact={variant === "sheet"} /> : <Legend compact={variant === "sheet"} />}

      <SeatMapViewport variant={variant}>
        <div className="flex w-max min-w-full flex-col items-stretch">
          <p className="mb-2 text-center font-lab text-[0.65rem] font-semibold uppercase tracking-widest text-plum sm:text-xs">
            Back · furthest from stage
          </p>

          <SectionBlocks
            variant={variant}
            rear
            selected={selected}
            locked={locked}
            onToggle={onToggle}
            consoleRow={consoleSpan}
            live={live}
          />

          <AisleBand />

          <p className="mb-2 text-center font-lab text-[0.65rem] font-semibold uppercase tracking-widest text-muted sm:text-xs">
            Front · row A below is closest to stage
          </p>
          <SectionBlocks
            variant={variant}
            rear={false}
            selected={selected}
            locked={locked}
            onToggle={onToggle}
            live={live}
          />

          <Stage />
        </div>
      </SeatMapViewport>

      {variant === "sheet" || live ? null : (
        <div className="max-lg:hidden">
          <SelectionSummary selected={selected} />
        </div>
      )}
    </div>
  );
}

function LiveLegend({ compact }: { compact?: boolean }) {
  const items = [
    { label: "Open", swatch: "border-2 border-[#cdb9cf] bg-white" },
    { label: "Held", swatch: "border-2 border-[#e8b84a] bg-[#fff6d8]" },
    { label: "Booked", swatch: "border-2 border-burg bg-burg/80" },
    { label: "Not on sale", swatch: "border-2 border-zinc-300 bg-zinc-200" },
    { label: "Wheelchair", swatch: "border-2 border-amber-400 bg-amber-50" },
  ];
  return (
    <TableLegend compact={compact}>
      {items.map((item) => (
        <span
          key={item.label}
          role="listitem"
          className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-tint/80 ${
            compact ? "px-2 py-0.5" : "gap-1.5 rounded-md px-2 py-1"
          }`}
        >
          <span className={`inline-block shrink-0 rounded-sm ${compact ? "size-3" : "size-4"} ${item.swatch}`} aria-hidden />
          <span className="font-medium">{item.label}</span>
        </span>
      ))}
      <span className={`inline-flex shrink-0 items-center gap-1.5 font-semibold text-plum ${compact ? "text-[0.65rem]" : "text-xs"}`}>
        <span className={`inline-block rounded-sm ${compact ? "size-3.5" : "size-5 rounded-md"} ${SELECTED.split(" ").slice(0, 3).join(" ")}`} aria-hidden />
        Selected
      </span>
    </TableLegend>
  );
}

function liveTone(offer: LiveSeat | undefined, selected: boolean) {
  if (selected) return SELECTED;
  if (!offer) return ALLOC_BASE.missing;
  if (offer.seatType === "WHEELCHAIR" && offer.bookable) return ALLOC_BASE.wheelchair;
  if (offer.bookable) return ALLOC_BASE.available;
  if (offer.status === "HELD") return "border-2 border-[#e8b84a] bg-[#fff6d8] text-ink cursor-not-allowed";
  if (offer.status === "BOOKED") return "border-2 border-burg bg-burg/80 text-white cursor-not-allowed";
  return "border-2 border-zinc-300 bg-zinc-200 text-zinc-600 cursor-not-allowed";
}

function Legend({ compact }: { compact?: boolean }) {
  const items: SeatAllocation[] = [
    "available",
    "vip",
    "wheelchair",
    "venue",
    "sur_sandhya",
    "missing",
  ];
  return (
    <TableLegend compact={compact}>
      {items.map((a) => (
        <LegendItem key={a} allocation={a} compact={compact} />
      ))}
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 font-semibold text-plum ${
          compact ? "rounded-full bg-tint px-2 py-1 text-[0.65rem]" : "rounded-lg bg-tint px-2.5 py-1.5 text-xs"
        }`}
      >
        <span className={`inline-block rounded-sm ${compact ? "size-3.5" : "size-5 rounded-md"} ${SELECTED.split(" ").slice(0, 3).join(" ")}`} aria-hidden />
        Selected
      </span>
    </TableLegend>
  );
}

function TableLegend({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <div
      className={`flex gap-1.5 overflow-x-auto overscroll-x-contain text-ink [scrollbar-width:thin] [&::-webkit-scrollbar]:block [&::-webkit-scrollbar]:h-1.5 ${
        compact
          ? "shrink-0 py-0.5 text-[0.65rem] max-lg:-mx-0.5"
          : "rounded-rasa border border-line bg-white p-2.5 text-xs shadow-sm"
      }`}
      role="list"
      aria-label="Seat legend"
    >
      {children}
    </div>
  );
}

function LegendItem({ allocation, compact }: { allocation: SeatAllocation; compact?: boolean }) {
  return (
    <span
      role="listitem"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-tint/80 ${
        compact ? "px-2 py-0.5" : "gap-1.5 rounded-md px-2 py-1 max-lg:py-0.5"
      }`}
    >
      <span
        className={`inline-block shrink-0 rounded-sm ${compact ? "size-3" : "size-4 lg:size-5 lg:rounded-md"} ${LEGEND_SWATCH[allocation]}`}
        aria-hidden
      />
      <span className={`font-medium ${compact ? "text-[0.65rem]" : "max-lg:text-[0.65rem]"}`}>
        <span className="lg:hidden">{LEGEND_SHORT[allocation]}</span>
        <span className="hidden lg:inline">{ALLOCATION_LABEL[allocation]}</span>
      </span>
    </span>
  );
}

function SectionBlocks({
  variant,
  rear,
  selected,
  locked,
  onToggle,
  consoleRow,
  live,
}: {
  variant?: "default" | "sheet";
  rear: boolean;
  selected: Set<string>;
  locked: Set<string>;
  onToggle: (id: string) => void;
  consoleRow?: string;
  live?: Map<string, LiveSeat>;
}) {
  const rows = rear ? [...REAR_ROWS].reverse() : [...FRONT_ROWS].reverse();
  const widthClass =
    variant === "sheet"
      ? "w-max max-w-none"
      : "w-max max-w-none lg:w-full lg:max-w-full";
  return (
    <div
      className={`flex shrink-0 items-start justify-center gap-0.5 max-lg:gap-px sm:gap-1 lg:gap-1.5 xl:gap-2.5 2xl:gap-3 ${widthClass}`}
    >
      {BLOCKS.map((b, i) => (
        <div key={b.id} className="flex shrink-0 items-start gap-0.5 sm:gap-1">
          {i > 0 ? <StairGutter /> : null}
          <div className="shrink-0 rounded-md border border-line bg-white px-1 pb-1 pt-1 shadow-sm sm:rounded-lg sm:px-1.5 lg:px-1 xl:px-1.5">
            <p className="mb-0.5 text-center font-lab text-[0.55rem] font-bold leading-tight text-plum sm:text-[0.65rem] lg:uppercase lg:tracking-widest">
              {b.label}
            </p>
            <ColumnHeader from={b.colStart} to={b.colEnd} />
            <BlockGrid
              block={b.id}
              rear={rear}
              rows={rows}
              selected={selected}
              locked={locked}
              onToggle={onToggle}
              consoleRow={rear && b.id === "center" ? consoleRow : undefined}
              live={live}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ColumnHeader({ from, to }: { from: number; to: number }) {
  const nums: number[] = [];
  for (let c = from; c <= to; c++) nums.push(c);
  return (
    <div className="mb-0.5 flex items-center gap-0.5 pl-6 sm:pl-7 lg:pl-8 xl:pl-9 2xl:pl-10">
      {nums.map((n) => (
        <span
          key={n}
          className={`flex shrink-0 justify-center font-lab text-[0.65rem] font-bold tabular-nums text-plum max-lg:text-[10px] ${COL_W}`}
        >
          {n}
        </span>
      ))}
    </div>
  );
}

function StairGutter() {
  return (
    <div
      className="mt-10 flex w-3 shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-sm border border-dashed border-plum/25 bg-plum/5 px-0.5 sm:mt-12 sm:w-4 lg:mt-8"
      title="Stairs"
    >
      <span className="rotate-180 text-[0.45rem] font-bold uppercase tracking-[0.2em] text-plum/60 [writing-mode:vertical-rl] sm:text-[0.5rem]">
        Stairs
      </span>
    </div>
  );
}

function BlockGrid({
  block,
  rear,
  rows,
  selected,
  locked,
  onToggle,
  consoleRow,
  live,
}: {
  block: SeatBlock;
  rear: boolean;
  rows: string[];
  selected: Set<string>;
  locked: Set<string>;
  onToggle: (id: string) => void;
  consoleRow?: string;
  live?: Map<string, LiveSeat>;
}) {
  const seats = useMemo(() => seatsForBlock(AUDITORIUM_SEATS, block, rear), [block, rear]);

  return (
    <div className="space-y-1">
      {rows.map((row) =>
        rear && block === "center" && row === consoleRow ? (
          <ConsoleRow key={row} colCount={15} />
        ) : (
          <SeatRow
            key={row}
            row={row}
            seats={seats.filter((s) => s.row === row)}
            selected={selected}
            locked={locked}
            onToggle={onToggle}
            live={live}
          />
        ),
      )}
    </div>
  );
}

function ConsoleRow({ colCount }: { colCount: number }) {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className={`${ROW_LABEL} shrink-0 text-right font-lab text-xs font-bold text-muted`}>ZC</span>
      <div
        className="flex h-6 items-center justify-center rounded-md border-2 border-orange-400 bg-orange-100 font-lab text-[0.55rem] font-bold uppercase tracking-widest text-orange-900 sm:h-7 sm:text-[0.6rem] lg:h-5 lg:text-xs"
        style={{ minWidth: colCount * 22 }}
      >
        Console
      </div>
    </div>
  );
}

function SeatRow({
  row,
  seats,
  selected,
  locked,
  onToggle,
  live,
}: {
  row: string;
  seats: { row: string; col: number; allocation: SeatAllocation }[];
  selected: Set<string>;
  locked: Set<string>;
  onToggle: (id: string) => void;
  live?: Map<string, LiveSeat>;
}) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <span className={`${ROW_LABEL} text-right font-lab font-bold tabular-nums text-plum sm:text-xs lg:text-sm`}>
        {row}
      </span>
      <div className="flex gap-0.5 sm:gap-1">
        {[...seats].sort((a, b) => a.col - b.col).map((s) => {
          const id = seatId(s.row, s.col);
          const offer = live?.get(id);
          const isSelected = selected.has(id);
          const isLocked = locked.has(id) && !isSelected;
          const canPick = live ? Boolean(offer?.bookable) && !isLocked : selectableAllocation(s.allocation) && !isLocked;
          const label = live
            ? `Row ${s.row}, seat ${s.col}${offer ? ` — ${offer.status}` : ""}`
            : `Row ${s.row}, seat ${s.col} — ${ALLOCATION_LABEL[s.allocation]}`;
          const showNum = live ? Boolean(offer) : selectableAllocation(s.allocation);
          const tone = live ? liveTone(offer, isSelected) : isSelected ? SELECTED : ALLOC_BASE[s.allocation];

          return (
            <button
              key={id}
              type="button"
              disabled={!canPick && !isSelected}
              title={label}
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => {
                if (canPick || isSelected) onToggle(id);
              }}
              className={`flex shrink-0 items-center justify-center rounded-md font-semibold tabular-nums transition aria-pressed:[&_span]:text-white ${SEAT_CELL} ${tone} ${isLocked ? "opacity-45" : ""} ${canPick || isSelected ? "cursor-pointer active:scale-95" : ""}`}
            >
              {showNum || isSelected ? (
                <span className={SEAT_NUM}>{s.col}</span>
              ) : (
                <span className="sr-only">{s.col}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AisleBand() {
  return (
    <div className="my-2 flex items-center gap-2 py-1 sm:my-4 sm:gap-3 sm:py-2">
      <div className="h-0.5 flex-1 bg-plum/20" />
      <span className="rounded-full bg-tint2 px-3 py-1 font-lab text-xs font-bold uppercase tracking-widest text-plum">
        Aisle
      </span>
      <div className="h-0.5 flex-1 bg-plum/20" />
    </div>
  );
}

function Stage() {
  return (
    <div
      className="mt-0 w-full shrink-0 border-[3px] border-[#c4722a] bg-[#f3ba6c] py-2.5 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,.4)] max-lg:py-3"
      role="img"
      aria-label="Stage — front of the auditorium (bottom of map)"
    >
      <p className="font-display text-lg font-bold uppercase tracking-[0.32em] text-[#1a1208] max-lg:text-xl sm:text-xl">
        Stage
      </p>
    </div>
  );
}

function SelectionSummary({ selected }: { selected: Set<string> }) {
  if (!selected.size) {
    return (
      <p className="text-xs leading-relaxed text-muted sm:text-sm">
        Tap an open seat. On mobile, drag the map with your finger if you need to move around the hall.
      </p>
    );
  }

  let total = 0;
  const chips: string[] = [];
  selected.forEach((id) => {
    const dash = id.lastIndexOf("-");
    const row = id.slice(0, dash);
    const col = Number(id.slice(dash + 1));
    const seat = AUDITORIUM_SEATS.find((s) => s.row === row && s.col === col);
    if (!seat) return;
    const tier = tierForAllocation(seat.allocation);
    if (!tier) return;
    total += TIER_PRICE_INR[tier];
    chips.push(`Row ${row}, seat ${col} · ${TIER_LABEL[tier]}`);
  });

  chips.sort();

  return (
    <div className="rounded-rasa border-2 border-plum/20 bg-tint px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-lg text-plum">
          {selected.size} seat{selected.size === 1 ? "" : "s"} selected
        </span>
        <span className="font-display text-xl text-burg tabular-nums">{formatInr(total)}</span>
      </div>
      <ul className="mt-2 grid list-none gap-1.5 sm:grid-cols-2">
        {chips.map((c) => (
          <li key={c} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-plum">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}