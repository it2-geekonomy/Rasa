"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AUDITORIUM_SEATS,
  ALLOCATION_LABEL,
  FRONT_ROWS,
  REAR_ROWS,
  seatId,
  selectableAllocation,
  type SeatAllocation,
} from "@/lib/rasa/auditorium-seats";
import { formatInr, TIER_LABEL, TIER_PRICE_INR, tierForAllocation } from "@/lib/rasa/booking-pricing";

/* ------------------------------------------------------------------ */
/* Layout data                                                         */
/* ------------------------------------------------------------------ */

type Seat = (typeof AUDITORIUM_SEATS)[number];

const BLOCKS = [
  { id: "left", colStart: 1, colEnd: 12 },
  { id: "center", colStart: 13, colEnd: 27 },
  { id: "right", colStart: 28, colEnd: 39 },
] as const;

const REAR_LIST: string[] = [...REAR_ROWS].reverse();
const FRONT_LIST: string[] = [...FRONT_ROWS].reverse();
const SEAT_AT = new Map<string, Seat>(AUDITORIUM_SEATS.map((s) => [seatId(s.row, s.col), s]));
const CONSOLE_ROW = AUDITORIUM_SEATS.find((s) => s.allocation === "console")?.row ?? "ZC";

const GAP = 3; // gap between seats in px
type Dims = { w: number; h: number; stageH: number };
const DEFAULT_DIMS: Dims = { w: 28, h: 26, stageH: 100 };

function clampNum(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function range(from: number, to: number) {
  const out: number[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const ALLOC_BASE: Record<SeatAllocation, string> = {
  available: "border-2 border-[#cdb9cf] bg-white text-ink hover:border-plum hover:bg-tint",
  vip: "border-2 border-sky-400 bg-sky-100 text-sky-950",
  wheelchair: "border-2 border-amber-400 bg-amber-100 text-amber-950",
  venue: "border-2 border-emerald-500/90 bg-emerald-200 text-emerald-950",
  sur_sandhya: "border-2 border-zinc-500 bg-zinc-400 text-zinc-800",
  missing: "border-2 border-dashed border-white/20 bg-transparent",
  console: "border-0 bg-orange-300",
};

const SELECTED =
  "border-2 border-white bg-[#168a45] text-white shadow-[0_0_10px_rgba(22,138,69,.75)]";

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
  vip: "border-2 border-sky-400 bg-sky-100",
  wheelchair: "border-2 border-amber-400 bg-amber-100",
  venue: "border-2 border-emerald-400 bg-emerald-200",
  sur_sandhya: "border-2 border-zinc-500 bg-zinc-400",
  missing: "border-2 border-dashed border-red-200 bg-red-50",
  console: "bg-orange-300",
};

export type LiveSeat = {
  eventSeatId: string;
  bookable: boolean;
  status: string;
  seatType: string;
};

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

type Props = {
  selected: Set<string>;
  onToggle: (id: string) => void;
  lockedIds?: Set<string>;
  /** Programme sheet: map fills height; hide duplicate summary under map. */
  variant?: "default" | "sheet";
  /** Live inventory keyed by row-seat, for example A-12. */
  live?: Map<string, LiveSeat>;
};

type ScrollMetrics = {
  sl: number;
  st: number;
  cw: number;
  ch: number;
  sw: number;
  sh: number;
};

type MiniSeatRect = { id: string; x: number; y: number; w: number; h: number; allocation: SeatAllocation };
type MiniLayout = {
  sw: number;
  sh: number;
  seats: MiniSeatRect[];
  stage: { x: number; y: number; w: number; h: number } | null;
};

export function AuditoriumSeatMap({ selected, onToggle, lockedIds, variant = "default", live }: Props) {
  const locked = useMemo(() => lockedIds ?? new Set<string>(), [lockedIds]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>({ sl: 0, st: 0, cw: 0, ch: 0, sw: 0, sh: 0 });
  const [miniLayout, setMiniLayout] = useState<MiniLayout | null>(null);
  const [miniVisible, setMiniVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const didCenterRef = useRef(false);

  const showMiniBriefly = useCallback(() => {
    setMiniVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setMiniVisible(false), 1200);
  }, []);

  const syncMetrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setMetrics({
      sl: el.scrollLeft,
      st: el.scrollTop,
      cw: el.clientWidth,
      ch: el.clientHeight,
      sw: el.scrollWidth,
      sh: el.scrollHeight,
    });
  }, []);

  const measureMiniLayout = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sw = el.scrollWidth;
    const sh = el.scrollHeight;
    if (sw <= 0 || sh <= 0) return;

    const elRect = el.getBoundingClientRect();
    const ox = el.scrollLeft - elRect.left;
    const oy = el.scrollTop - elRect.top;

    const rowEls = el.querySelectorAll<HTMLElement>("[data-mini-row]");
    const seats: MiniSeatRect[] = [];
    let colXs: number[] | null = null;
    let seatW = DEFAULT_DIMS.w;

    rowEls.forEach((rowEl) => {
      const row = rowEl.dataset.miniRow;
      if (!row) return;
      const rRect = rowEl.getBoundingClientRect();
      const ry = rRect.top + oy;
      const rh = rRect.height;

      if (!colXs) {
        const blockEls = rowEl.querySelectorAll<HTMLElement>("[data-mini-block]");
        if (blockEls.length === 3) {
          colXs = [];
          blockEls.forEach((bEl, idx) => {
            const bRect = bEl.getBoundingClientRect();
            const b = BLOCKS[idx];
            const count = b.colEnd - b.colStart + 1;
            const step = (bRect.width + GAP) / count;
            seatW = Math.max(4, step - GAP);
            for (let i = 0; i < count; i++) {
              colXs!.push(bRect.left + ox + i * step);
            }
          });
        }
      }

      if (!colXs) return;
      for (let col = 1; col <= 39; col++) {
        const seat = SEAT_AT.get(seatId(row, col));
        if (!seat || seat.allocation === "missing") continue;
        seats.push({
          id: seatId(row, col),
          x: colXs[col - 1],
          y: ry,
          w: seatW,
          h: rh,
          allocation: seat.allocation,
        });
      }
    });

    const stageEl = el.querySelector<HTMLElement>("[data-mini-stage]");
    const sRect = stageEl?.getBoundingClientRect();
    const stage = sRect ? { x: sRect.left + ox, y: sRect.top + oy, w: sRect.width, h: sRect.height } : null;

    setMiniLayout({ sw, sh, seats, stage });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el) return;

    if (!didCenterRef.current && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      didCenterRef.current = true;
    }
    syncMetrics();
    measureMiniLayout();

    const onScroll = () => {
      syncMetrics();
      showMiniBriefly();
    };

    const onResize = () => {
      syncMetrics();
      measureMiniLayout();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    if (content) ro.observe(content);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [syncMetrics, measureMiniLayout, showMiniBriefly]);

  const scrollToRatio = useCallback((rx: number, ry: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, rx * el.scrollWidth - el.clientWidth / 2));
    el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, ry * el.scrollHeight - el.clientHeight / 2));
  }, []);

  const onSeat = useCallback(
    (_el: HTMLButtonElement, seat: Seat) => {
      const id = seatId(seat.row, seat.col);
      const isSel = selected.has(id);
      const offer = live?.get(id);
      const open = live ? Boolean(offer?.bookable) : selectableAllocation(seat.allocation);
      const canPick = open && !(locked.has(id) && !isSel);
      if (canPick || isSel) onToggle(id);
    },
    [selected, locked, onToggle, live],
  );

  const sheet = variant === "sheet";
  const total = selectionTotal(selected);
  const showMiniMap = metrics.sw > metrics.cw + 4 || metrics.sh > metrics.ch + 4;

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col ${
        sheet ? "h-full min-h-0 flex-1 gap-2" : "space-y-3 max-lg:gap-2 max-lg:space-y-2"
      }`}
    >
      {live ? <LiveLegend compact={sheet} /> : <Legend compact={sheet} />}

      <div className={`relative flex w-full min-w-0 flex-col ${sheet ? "min-h-0 flex-1" : ""}`}>
        <div
          ref={scrollRef}
          className={`w-full select-none overflow-auto overscroll-contain touch-pan-x touch-pan-y rounded-rasa bg-[#150b1b] p-3 shadow-inner [scrollbar-color:rgba(255,255,255,0.45)_rgba(255,255,255,0.08)] [scrollbar-width:thin] [&::-webkit-scrollbar]:block [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/10 ${
            sheet ? "min-h-0 flex-1" : "max-h-[72vh]"
          }`}
        >
          <div ref={contentRef} className="mx-auto flex w-max min-w-full flex-col items-center">
            <Hall selected={selected} locked={locked} onSeat={onSeat} dims={DEFAULT_DIMS} live={live} />
          </div>
        </div>

        {showMiniMap && miniLayout ? (
          <MiniMap
            metrics={metrics}
            layout={miniLayout}
            selected={selected}
            live={live}
            visible={miniVisible}
            onJump={(rx, ry) => {
              showMiniBriefly();
              scrollToRatio(rx, ry);
            }}
          />
        ) : null}
      </div>

      {sheet || live ? null : (
        <div className="max-lg:hidden">
          <SelectionSummary selected={selected} />
        </div>
      )}
      {sheet && selected.size > 0 ? (
        <p className="sr-only">
          {selected.size} seat{selected.size === 1 ? "" : "s"} selected, {formatInr(total)}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The hall itself (memoised so panning never re-renders every seat)   */
/* ------------------------------------------------------------------ */

type HallProps = {
  dims: Dims;
  selected: Set<string>;
  locked: Set<string>;
  onSeat: (el: HTMLButtonElement, seat: Seat) => void;
  live?: Map<string, LiveSeat>;
};

const Hall = memo(function Hall({ selected, locked, onSeat, dims, live }: HallProps) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-[#ffcf8a]/20 to-transparent"
        aria-hidden
      />
      <div className="relative px-5 pt-4">
        <BandLabel>Back · furthest from stage</BandLabel>
        <NumberRow w={dims.w} />
        {REAR_LIST.map((row) => (
          <HallRow key={row} row={row} rear selected={selected} locked={locked} onSeat={onSeat} dims={dims} live={live} />
        ))}

        <div className="my-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/15" />
          <span className="font-lab text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">Aisle</span>
          <div className="h-px flex-1 bg-white/15" />
        </div>

        <BandLabel>Front · closest to stage</BandLabel>
        <NumberRow w={dims.w} />
        {FRONT_LIST.map((row) => (
          <HallRow key={row} row={row} rear={false} selected={selected} locked={locked} onSeat={onSeat} dims={dims} live={live} />
        ))}
      </div>
      <div
        className="relative mt-2 w-0 min-w-full"
        style={{ paddingInline: 55 + dims.w * 1.5 }}
      >
        <div data-mini-stage className="relative flex w-full justify-center">
          <StageArt height={dims.stageH} />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center pt-1 font-serif text-[clamp(0.75rem,1.5vw,1.15rem)] tracking-[0.65em] text-[#fff3d6]/90"
          >
            STAGE
          </span>
        </div>
      </div>
    </div>
  );
});

function BandLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-center font-lab text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">{children}</p>
  );
}

function RowLabel({ children }: { children: ReactNode }) {
  return <span className="w-6 shrink-0 text-center font-lab text-[11px] font-bold text-white/60">{children}</span>;
}

function NumberRow({ w }: { w: number }) {
  return (
    <div className="mb-[3px] flex items-center justify-center gap-2" aria-hidden>
      <span className="w-6 shrink-0" />
      {BLOCKS.map((b, i) => (
        <div key={b.id} className="flex items-center gap-2">
          {i > 0 ? <span className="w-3" /> : null}
          <div className="flex gap-[3px]">
            {range(b.colStart, b.colEnd).map((n) => (
              <span key={n} className="flex shrink-0 justify-center font-lab text-[9px] font-bold tabular-nums text-white/40" style={{ width: w }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      ))}
      <span className="w-6 shrink-0" />
    </div>
  );
}

function HallRow({
  row,
  rear,
  selected,
  locked,
  onSeat,
  dims,
  live,
}: {
  dims: Dims;
  row: string;
  rear: boolean;
  selected: Set<string>;
  locked: Set<string>;
  onSeat: (el: HTMLButtonElement, seat: Seat) => void;
  live?: Map<string, LiveSeat>;
}) {
  return (
    <div data-mini-row={row} className="mb-[3px] flex items-center justify-center gap-2">
      <RowLabel>{row}</RowLabel>
      {BLOCKS.map((b, i) => (
        <div key={b.id} className="flex items-center gap-2">
          {i > 0 ? (
            <span
              className="w-3 shrink-0 self-stretch rounded-sm border-x border-dashed border-white/15 bg-white/[0.04]"
              aria-hidden
            />
          ) : null}
          <div data-mini-block={b.id} className="flex gap-[3px]">
            {rear && b.id === "center" && row === CONSOLE_ROW ? (
              <div
                className="flex items-center justify-center rounded-md border-2 border-orange-400 bg-orange-200 font-lab text-[10px] font-bold uppercase tracking-[0.3em] text-orange-950"
                style={{ height: dims.h, width: (b.colEnd - b.colStart + 1) * dims.w + (b.colEnd - b.colStart) * GAP }}
              >
                Console
              </div>
            ) : (
              range(b.colStart, b.colEnd).map((col) => {
                const seat = SEAT_AT.get(seatId(row, col));
                if (!seat) return <span key={col} className="shrink-0" style={{ width: dims.w, height: dims.h }} />;
                return (
                  <SeatCell key={col} seat={seat} selected={selected} locked={locked} onSeat={onSeat} dims={dims} live={live} />
                );
              })
            )}
          </div>
        </div>
      ))}
      <RowLabel>{row}</RowLabel>
    </div>
  );
}

function SeatCell({
  seat,
  selected,
  locked,
  onSeat,
  dims,
  live,
}: {
  dims: Dims;
  seat: Seat;
  selected: Set<string>;
  locked: Set<string>;
  onSeat: (el: HTMLButtonElement, seat: Seat) => void;
  live?: Map<string, LiveSeat>;
}) {
  const id = seatId(seat.row, seat.col);
  const offer = live?.get(id);
  const isSelected = selected.has(id);
  const isLocked = locked.has(id) && !isSelected;
  const canPick = (live ? Boolean(offer?.bookable) : selectableAllocation(seat.allocation)) && !isLocked;
  const label = live
    ? `Row ${seat.row}, seat ${seat.col}${offer ? `, ${offer.status}` : ""}`
    : `Row ${seat.row}, seat ${seat.col} — ${ALLOCATION_LABEL[seat.allocation]}`;
  const showNum = (live ? Boolean(offer) : selectableAllocation(seat.allocation)) || isSelected;
  const tone = live ? liveTone(offer, isSelected) : isSelected ? SELECTED : ALLOC_BASE[seat.allocation];

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isSelected}
      aria-disabled={!canPick && !isSelected}
      onClick={(event) => onSeat(event.currentTarget, seat)}
      style={{ width: dims.w, height: dims.h, fontSize: clampNum(dims.h - 4, 8, 12) }}
      className={`flex shrink-0 items-center justify-center rounded-b-[3px] rounded-t-[8px] font-lab font-bold leading-none tabular-nums transition-colors motion-reduce:transition-none ${tone} ${isLocked ? "opacity-40" : ""} ${canPick || isSelected ? "cursor-pointer" : "cursor-not-allowed"}`}
    >
      <span className={`pointer-events-none ${showNum ? "" : "invisible"}`}>{seat.col}</span>
    </button>
  );
}

function liveTone(offer: LiveSeat | undefined, selected: boolean) {
  if (selected) return SELECTED;
  if (!offer) return ALLOC_BASE.missing;
  if (offer.bookable) return ALLOC_BASE.available;
  if (offer.status === "HELD") return "border-2 border-[#e8b84a] bg-[#fff6d8] text-ink";
  if (offer.status === "BOOKED") return "border-2 border-burg bg-burg text-white";
  return "border-2 border-zinc-500 bg-zinc-600 text-zinc-200";
}

function LiveLegend({ compact }: { compact?: boolean }) {
  const items = [
    { label: "Available", swatch: "border-2 border-[#cdb9cf] bg-white" },
    { label: "Blocked", swatch: "border-2 border-zinc-500 bg-zinc-600" },
    { label: "Held", swatch: "border-2 border-[#e8b84a] bg-[#fff6d8]" },
    { label: "Booked", swatch: "border-2 border-burg bg-burg" },
  ];
  return (
    <TableLegend compact={compact}>
      {items.map((item) => (
        <span
          key={item.label}
          role="listitem"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tint/80 px-2.5 py-1 text-xs"
        >
          <span className={`inline-block size-3.5 shrink-0 rounded-sm sm:size-4 ${item.swatch}`} aria-hidden />
          <span className="font-medium">{item.label}</span>
        </span>
      ))}
      <span
        role="listitem"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-plum"
      >
        <span className="inline-block size-3.5 shrink-0 rounded-sm border-2 border-[#168a45] bg-[#168a45] sm:size-4" aria-hidden />
        Selected
      </span>
    </TableLegend>
  );
}

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */

const FOOTLIGHTS = Array.from({ length: 27 }, (_, i) => {
  const t = 0.03 + (i / 26) * 0.94;
  const u = 1 - t;
  return {
    x: u * u * 975 + 2 * u * t * 500 + t * t * 25,
    y: u * u * 128 + 2 * u * t * 188 + t * t * 128 + 9,
  };
});

/** A proper proscenium stage: curtains, back wall, planked floor, spotlights, footlights, curved lip. */
function StageArt({ height }: { height: number }) {
  return (
    <svg
      viewBox="0 0 1000 185"
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height }}
      role="img"
      aria-label="Stage, front of the auditorium. Row A is closest."
    >
      <defs>
        <linearGradient id="rs-fold" x1="0" x2="26" y1="0" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
          <stop offset="0" stopColor="#4a0c18" />
          <stop offset="0.5" stopColor="#a3243b" />
          <stop offset="1" stopColor="#4a0c18" />
        </linearGradient>
        <linearGradient id="rs-wall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2e1535" />
          <stop offset="1" stopColor="#120717" />
        </linearGradient>
        <linearGradient id="rs-floor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8a5226" />
          <stop offset="1" stopColor="#d79a58" />
        </linearGradient>
        <linearGradient id="rs-beam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff0c2" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff0c2" stopOpacity="0" />
        </linearGradient>
        <clipPath id="rs-floor-clip">
          <path d="M70 58 L930 58 L975 128 Q500 188 25 128 Z" />
        </clipPath>
      </defs>

      <rect x="40" y="14" width="920" height="46" fill="url(#rs-wall)" />

      <g clipPath="url(#rs-floor-clip)">
        <rect x="0" y="58" width="1000" height="130" fill="url(#rs-floor)" />
        {Array.from({ length: 13 }, (_, i) => (
          <line
            key={i}
            x1={70 + (i * 860) / 12}
            y1="58"
            x2={-120 + (i * 1240) / 12}
            y2="200"
            stroke="#5b3416"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
        ))}
        {[250, 500, 750].map((x) => (
          <ellipse key={x} cx={x} cy="112" rx="95" ry="17" fill="#fff0c2" fillOpacity="0.28" />
        ))}
      </g>

      {[250, 500, 750].map((x) => (
        <polygon key={x} points={`${x - 12},16 ${x + 12},16 ${x + 100},120 ${x - 100},120`} fill="url(#rs-beam)" />
      ))}

      <path d="M0 16 L170 16 Q152 92 96 142 Q56 176 0 182 Z" fill="url(#rs-fold)" />
      <path d="M1000 16 L830 16 Q848 92 904 142 Q944 176 1000 182 Z" fill="url(#rs-fold)" />

      <rect x="0" y="0" width="1000" height="18" fill="#6b1424" />
      <rect x="0" y="18" width="1000" height="3" fill="#d9a441" />

      <path d="M975 128 Q500 188 25 128" fill="none" stroke="#e9b25a" strokeWidth="5" />
      <path d="M975 135 Q500 195 25 135" fill="none" stroke="#4a2a10" strokeWidth="4" />

      {FOOTLIGHTS.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="8" fill="#ffd77a" fillOpacity="0.22" />
          <circle cx={p.x} cy={p.y} r="3.2" fill="#fff1c4" />
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Legend and summary                                                  */
/* ------------------------------------------------------------------ */

function Legend({ compact }: { compact?: boolean }) {
  const items: SeatAllocation[] = ["available", "vip", "wheelchair", "venue", "sur_sandhya", "missing"];
  return (
    <TableLegend compact={compact}>
      {items.map((a) => (
        <LegendItem key={a} allocation={a} compact={compact} />
      ))}
      <span
        role="listitem"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-plum"
      >
        <span
          className="inline-block size-3.5 shrink-0 rounded-sm border-2 border-[#168a45] bg-[#168a45] sm:size-4"
          aria-hidden
        />
        Selected
      </span>
    </TableLegend>
  );
}

function TableLegend({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 text-ink sm:gap-2 ${
        compact
          ? "shrink-0 py-1 text-xs"
          : "rounded-rasa border border-line bg-white p-2.5 text-xs shadow-sm sm:p-3"
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
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tint/80 px-2.5 py-1 text-xs ${
        compact ? "" : "sm:rounded-md"
      }`}
    >
      <span
        className={`inline-block size-3.5 shrink-0 rounded-sm sm:size-4 ${LEGEND_SWATCH[allocation]}`}
        aria-hidden
      />
      <span className="font-medium">
        <span className="sm:hidden">{LEGEND_SHORT[allocation]}</span>
        <span className="hidden sm:inline">{ALLOCATION_LABEL[allocation]}</span>
      </span>
    </span>
  );
}

function selectionTotal(selected: Set<string>) {
  let total = 0;
  selected.forEach((id) => {
    const seat = SEAT_AT.get(id);
    const tier = seat ? tierForAllocation(seat.allocation) : null;
    if (tier) total += TIER_PRICE_INR[tier];
  });
  return total;
}

function SelectionSummary({ selected }: { selected: Set<string> }) {
  if (!selected.size) {
    return (
      <p className="text-xs leading-relaxed text-muted sm:text-sm">
        Tap an open seat to pick it. Pinch or use + / − to zoom.
      </p>
    );
  }

  const chips: string[] = [];
  selected.forEach((id) => {
    const seat = SEAT_AT.get(id);
    if (!seat) return;
    const tier = tierForAllocation(seat.allocation);
    if (!tier) return;
    chips.push(`Row ${seat.row}, seat ${seat.col} · ${TIER_LABEL[tier]}`);
  });
  chips.sort();

  return (
    <div className="rounded-rasa border-2 border-plum/20 bg-tint px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-lg text-plum">
          {selected.size} seat{selected.size === 1 ? "" : "s"} selected
        </span>
        <span className="font-display text-xl text-burg tabular-nums">{formatInr(selectionTotal(selected))}</span>
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

/* ------------------------------------------------------------------ */
/* BookMyShow-style floating mini-map                                  */
/* ------------------------------------------------------------------ */

const MINI_W = 116;

function MiniMap({
  metrics,
  layout,
  selected,
  live,
  visible,
  onJump,
}: {
  metrics: ScrollMetrics;
  layout: MiniLayout;
  selected: Set<string>;
  live?: Map<string, LiveSeat>;
  visible: boolean;
  onJump: (rx: number, ry: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const ratio = layout.sw > 0 ? layout.sh / layout.sw : 0.75;
  const miniH = Math.max(56, Math.round(MINI_W * ratio));

  const jumpFromPointer = (clientX: number, clientY: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    const rx = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const ry = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    onJump(rx, ry);
  };

  return (
    <div
      className={`absolute left-2.5 top-2.5 z-20 rounded-lg border border-white/20 bg-black/75 p-1.5 shadow-lg backdrop-blur-xs transition-opacity duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden
    >
      <div
        ref={boxRef}
        className="relative cursor-pointer touch-none overflow-hidden"
        style={{ width: MINI_W, height: miniH }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          jumpFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) jumpFromPointer(e.clientX, e.clientY);
        }}
      >
        <MiniMapGrid layout={layout} selected={selected} live={live} />
        <div
          className="pointer-events-none absolute border-2 border-[#ef4444] bg-[#ef4444]/15"
          style={{
            left: `${(metrics.sl / metrics.sw) * 100}%`,
            top: `${(metrics.st / metrics.sh) * 100}%`,
            width: `${Math.min(100, (metrics.cw / metrics.sw) * 100)}%`,
            height: `${Math.min(100, (metrics.ch / metrics.sh) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function miniFill(id: string, allocation: SeatAllocation, selected: Set<string>, live?: Map<string, LiveSeat>) {
  if (selected.has(id)) return "#168a45";
  if (!live) return selectableAllocation(allocation) ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.28)";
  const offer = live.get(id);
  if (offer?.bookable) return "rgba(255,255,255,0.88)";
  if (offer?.status === "HELD") return "#e8b84a";
  if (offer?.status === "BOOKED") return "#931929";
  return "rgba(255,255,255,0.28)";
}

const MiniMapGrid = memo(function MiniMapGrid({
  layout,
  selected,
  live,
}: {
  layout: MiniLayout;
  selected: Set<string>;
  live?: Map<string, LiveSeat>;
}) {
  return (
    <svg viewBox={`0 0 ${layout.sw} ${layout.sh}`} preserveAspectRatio="none" className="block size-full">
      {layout.seats.map((s) => {
        const fill = miniFill(s.id, s.allocation, selected, live);
        return <rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} rx={4} fill={fill} />;
      })}
      {layout.stage ? (
        <rect
          x={layout.stage.x}
          y={layout.stage.y}
          width={layout.stage.w}
          height={layout.stage.h}
          rx={6}
          fill="rgba(255,240,194,0.55)"
        />
      ) : null}
    </svg>
  );
});