"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, type PageMeta } from "@/lib/admin/api";
import { ALL_ROWS, FRONT_ROWS, REAR_ROWS } from "@/lib/rasa/auditorium-seats";
import { fieldClass, Notice, primaryButtonClass, quietButtonClass } from "./ui";

type SeatRow = {
  id: string;
  allocationOwner: string;
  status: string;
  price: string | number;
  seat: {
    seatLabel: string;
    rowLabel: string;
    seatNumber: number;
    seatType: string;
    xPosition: string | number | null;
    yPosition: string | number | null;
    section: { sectionCode: string; sectionName: string };
  };
};

const ACTIONS = [
  { owner: "RASA", status: "AVAILABLE", label: "Available" },
  { owner: "RASA", status: "BLOCKED", label: "Block" },
] as const;

const BLOCKS = [
  { id: "left", label: "Seats 1–12", from: 1, to: 12 },
  { id: "center", label: "Seats 13–27", from: 13, to: 27 },
  { id: "right", label: "Seats 28–39", from: 28, to: 39 },
] as const;

const SELECTED = "border-emerald-700 bg-emerald-600 text-white shadow-[0_2px_6px_rgba(5,150,105,.35)]";

const SEAT_CELL =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 font-lab text-[11px] font-bold leading-none tabular-nums";

export function AdminSeatMap({
  sessionId,
  token,
  refreshKey,
  onChanged,
}: {
  sessionId: string;
  token: string;
  refreshKey: number;
  onChanged: (message: string) => void;
}) {
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const pickedRef = useRef(picked);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const stopDrag = useRef<(() => void) | null>(null);
  pickedRef.current = picked;

  useEffect(() => {
    let cancel = false;
    async function load() {
      const first = await api<{ data: SeatRow[]; meta: PageMeta }>(
        `/sessions/${sessionId}/seats?limit=100&page=1`,
        { token },
      );
      const pages = await Promise.all(
        Array.from({ length: Math.max(first.meta.totalPages - 1, 0) }, (_, index) =>
          api<{ data: SeatRow[] }>(`/sessions/${sessionId}/seats?limit=100&page=${index + 2}`, { token }),
        ),
      );
      if (!cancel) {
        setSeats([first.data, ...pages.map((page) => page.data)].flat());
        setPicked(new Set());
      }
    }
    load().catch((caught) => {
      if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load the seat layout");
    });
    return () => {
      cancel = true;
    };
  }, [sessionId, token, refreshKey]);

  const byLabel = useMemo(() => {
    const map = new Map<string, SeatRow>();
    for (const seat of seats) map.set(seat.seat.seatLabel, seat);
    return map;
  }, [seats]);

  const rearRows = useMemo(
    () => [...REAR_ROWS].reverse().filter((row) => seats.some((seat) => seat.seat.rowLabel === row)),
    [seats],
  );
  const frontRows = useMemo(
    () => [...FRONT_ROWS].reverse().filter((row) => seats.some((seat) => seat.seat.rowLabel === row)),
    [seats],
  );

  const selectedLabels = useMemo(() => {
    return seats
      .filter((seat) => picked.has(seat.id))
      .sort((a, b) => a.seat.seatLabel.localeCompare(b.seat.seatLabel, undefined, { numeric: true }))
      .map((seat) => seat.seat.seatLabel);
  }, [seats, picked]);

  function toggle(seat: SeatRow) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (seat.status === "BOOKED") return;
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  function paintDrag(label: string | null) {
    const drag = dragRef.current;
    if (!drag || !label) return;
    if (!drag.moved && label === drag.anchor.seat.seatLabel) return;
    const seat = byLabel.get(label);
    if (!seat) return;
    drag.moved = true;
    const next = seatsInRectangle(drag.anchor, seat, byLabel, drag.additive ? drag.base : new Set());
    if (sameIds(pickedRef.current, next)) return;
    setPicked(next);
  }

  function beginDrag(event: React.PointerEvent<HTMLButtonElement>, seat: SeatRow) {
    if (event.button !== 0 || seat.status === "BOOKED") return;
    stopDrag.current?.();
    const drag: Drag = {
      anchor: seat,
      additive: event.shiftKey || event.metaKey || event.ctrlKey,
      base: new Set(pickedRef.current),
      moved: false,
    };
    dragRef.current = drag;
    const move = (pointer: PointerEvent) => {
      const hit = document.elementFromPoint(pointer.clientX, pointer.clientY);
      paintDrag(hit?.closest("[data-seat]")?.getAttribute("data-seat") ?? null);
    };
    const up = () => {
      if (dragRef.current === drag && drag.moved) suppressClick.current = true;
      if (dragRef.current === drag) dragRef.current = null;
      stopDrag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    stopDrag.current = up;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  useEffect(() => {
    return () => stopDrag.current?.();
  }, []);

  async function apply(owner: string, status: string) {
    if (picked.size === 0) {
      setError("Select seats on the layout first.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await api<{ data: { updated: number } }>(`/sessions/${sessionId}/seats`, {
        method: "PATCH",
        token,
        body: {
          eventSeatIds: [...picked],
          allocationOwner: owner,
          status,
          ...(price !== "" ? { price: Number(price) } : {}),
        },
      });
      onChanged(`${result.data.updated} seats updated.`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update the seats");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-rasa border border-line bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-plum">Seat layout</h2>
          <p className="text-sm text-muted">
            Drag across seats to select a block. Click a seat to add or remove it. Hold Shift while dragging to add to the seats already selected. Booked seats stay put.
          </p>
        </div>
        <p className="text-sm font-medium text-plum">{picked.size} selected</p>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto text-xs text-ink" role="list" aria-label="Seat legend">
        <Legend swatch="border-[#cdb9cf] bg-white" label="Available" />
        <Legend swatch="border-zinc-300 bg-zinc-100" label="Blocked" />
        <Legend swatch="border-[#e8b84a] bg-[#fff6d8]" label="Held" />
        <Legend swatch="border-burg bg-burg" label="Booked" />
        <Legend swatch={SELECTED} label="Selected" />
      </div>
      {error ? (
        <div className="mt-3">
          <Notice>{error}</Notice>
        </div>
      ) : null}
      {selectedLabels.length > 0 ? (
        <p className="mt-3 text-sm text-plum">
          Selected: {selectedLabels.slice(0, 40).join(", ")}
          {selectedLabels.length > 40 ? ` and ${selectedLabels.length - 40} more` : ""}
        </p>
      ) : null}
      <div className="mt-3 max-h-[72vh] overflow-auto rounded-rasa bg-tint p-3 select-none">
        {seats.length === 0 ? (
          <p className="text-sm text-muted">Loading the auditorium…</p>
        ) : (
          <div className="flex w-max min-w-full flex-col">
            <p className="mb-2 text-center font-lab text-xs font-semibold tracking-widest text-plum uppercase">
              Back · furthest from stage
            </p>
            <SectionBands rows={rearRows} byLabel={byLabel} picked={picked} onToggle={toggle} onDragStart={beginDrag} />
            <div className="my-3 flex items-center gap-3">
              <div className="h-0.5 flex-1 bg-plum/20" />
              <span className="rounded-full bg-white px-3 py-1 font-lab text-xs font-bold tracking-widest text-plum uppercase">Aisle</span>
              <div className="h-0.5 flex-1 bg-plum/20" />
            </div>
            <p className="mb-2 text-center font-lab text-xs font-semibold tracking-widest text-muted uppercase">
              Front · row A below is closest to stage
            </p>
            <SectionBands rows={frontRows} byLabel={byLabel} picked={picked} onToggle={toggle} onDragStart={beginDrag} />
            <div className="mt-3 border-[3px] border-[#c4722a] bg-[#f3ba6c] py-2.5 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,.4)]">
              <p className="font-display text-lg font-bold tracking-[0.32em] text-[#1a1208] uppercase">Stage</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm text-muted">
          Price for the selected seats
          <input className={fieldClass} type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Leave blank to keep" />
        </label>
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className={action.status === "AVAILABLE" ? primaryButtonClass : quietButtonClass}
            disabled={pending}
            onClick={() => apply(action.owner, action.status)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function SectionBands({
  rows,
  byLabel,
  picked,
  onToggle,
  onDragStart,
}: {
  rows: readonly string[];
  byLabel: Map<string, SeatRow>;
  picked: Set<string>;
  onToggle: (seat: SeatRow) => void;
  onDragStart: (event: React.PointerEvent<HTMLButtonElement>, seat: SeatRow) => void;
}) {
  return (
    <div className="flex items-start justify-center gap-2">
      {BLOCKS.map((block, index) => (
        <div key={block.id} className="flex items-start gap-2">
          {index > 0 ? (
            <div className="mt-8 flex w-4 shrink-0 items-center justify-center self-stretch rounded-sm border border-dashed border-plum/25 bg-plum/5" title="Stairs">
              <span className="rotate-180 text-[0.5rem] font-bold tracking-[0.2em] text-plum/60 uppercase [writing-mode:vertical-rl]">Stairs</span>
            </div>
          ) : null}
          <div className="rounded-lg border border-line bg-white px-1.5 pt-1 pb-1 shadow-sm">
            <p className="mb-0.5 text-center font-lab text-[0.65rem] font-bold tracking-widest text-plum uppercase">{block.label}</p>
            <div className="mb-0.5 flex items-center gap-0.5 pl-8">
              {numbers(block.from, block.to).map((number) => (
                <span key={number} className="flex w-7 shrink-0 justify-center font-lab text-[10px] font-bold text-plum tabular-nums">
                  {number}
                </span>
              ))}
            </div>
            <div className="space-y-1">
              {rows.map((row) => (
                <GridRow key={`${block.id}-${row}`} row={row} from={block.from} to={block.to} byLabel={byLabel} picked={picked} onToggle={onToggle} onDragStart={onDragStart} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GridRow({
  row,
  from,
  to,
  byLabel,
  picked,
  onToggle,
  onDragStart,
}: {
  row: string;
  from: number;
  to: number;
  byLabel: Map<string, SeatRow>;
  picked: Set<string>;
  onToggle: (seat: SeatRow) => void;
  onDragStart: (event: React.PointerEvent<HTMLButtonElement>, seat: SeatRow) => void;
}) {
  const cols = numbers(from, to);
  const present = cols.filter((number) => byLabel.has(`${row}-${number}`));
  if (present.length === 0 && from === 13) {
    return (
      <div className="flex items-center gap-1">
        <span className="w-7 text-right font-lab text-xs font-bold text-plum">{row}</span>
        <div
          className="flex h-7 items-center justify-center rounded-md border-2 border-orange-400 bg-orange-100 font-lab text-[0.65rem] font-bold tracking-widest text-orange-900 uppercase"
          style={{ width: cols.length * 28 + (cols.length - 1) * 2 }}
        >
          Console
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="w-7 text-right font-lab text-xs font-bold text-plum">{row}</span>
      <div className="flex gap-0.5">
        {cols.map((number) => {
          const seat = byLabel.get(`${row}-${number}`);
          if (!seat) {
            return <span key={number} className="h-7 w-7 rounded-md border-2 border-dashed border-red-200 bg-red-50/50" title={`${row}-${number} is not a seat`} />;
          }
          const selected = picked.has(seat.id);
          const booked = seat.status === "BOOKED";
          return (
            <button
              key={seat.id}
              type="button"
              data-seat={seat.seat.seatLabel}
              title={`${seat.seat.seatLabel} · ${statusName(seat.status)} · ₹${Number(seat.price).toLocaleString("en-IN")}`}
              aria-pressed={selected}
              aria-disabled={booked}
              onPointerDown={(event) => onDragStart(event, seat)}
              onClick={() => onToggle(seat)}
              className={`${SEAT_CELL} touch-none ${selected ? SELECTED : tone(seat)} ${booked ? "cursor-not-allowed" : "cursor-pointer hover:border-plum"}`}
            >
              {number}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Drag = {
  anchor: SeatRow;
  additive: boolean;
  base: Set<string>;
  moved: boolean;
};

function seatsInRectangle(anchor: SeatRow, current: SeatRow, byLabel: Map<string, SeatRow>, base: Set<string>) {
  const rows = ALL_ROWS as readonly string[];
  const startRow = rows.indexOf(anchor.seat.rowLabel);
  const endRow = rows.indexOf(current.seat.rowLabel);
  const next = new Set(base);
  if (startRow < 0 || endRow < 0) {
    if (current.status !== "BOOKED") next.add(current.id);
    return next;
  }
  const rowSlice = new Set(rows.slice(Math.min(startRow, endRow), Math.max(startRow, endRow) + 1));
  const from = Math.min(anchor.seat.seatNumber, current.seat.seatNumber);
  const to = Math.max(anchor.seat.seatNumber, current.seat.seatNumber);
  for (const seat of byLabel.values()) {
    if (seat.status === "BOOKED") continue;
    if (!rowSlice.has(seat.seat.rowLabel)) continue;
    if (seat.seat.seatNumber < from || seat.seat.seatNumber > to) continue;
    next.add(seat.id);
  }
  return next;
}

function sameIds(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false;
  for (const id of left) if (!right.has(id)) return false;
  return true;
}

function numbers(from: number, to: number) {
  const values: number[] = [];
  for (let number = from; number <= to; number += 1) values.push(number);
  return values;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span role="listitem" className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-tint px-2 py-1">
      <span className={`inline-block size-4 rounded-sm border-2 ${swatch}`} />
      <span className="font-medium">{label}</span>
    </span>
  );
}

function statusName(status: string) {
  if (status === "AVAILABLE") return "Available";
  if (status === "BLOCKED") return "Blocked";
  if (status === "HELD") return "Held";
  if (status === "BOOKED") return "Booked";
  return status;
}

function tone(seat: SeatRow) {
  if (seat.status === "BOOKED") return "border-burg bg-burg text-white";
  if (seat.status === "HELD") return "border-[#e8b84a] bg-[#fff6d8] text-ink";
  if (seat.status === "AVAILABLE") return "border-[#cdb9cf] bg-white text-ink hover:bg-tint";
  return "border-zinc-300 bg-zinc-100 text-zinc-700";
}
