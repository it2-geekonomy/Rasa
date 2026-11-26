"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type PageMeta } from "@/lib/admin/api";
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

type PlacedSeat = SeatRow & { x: number; y: number };

const OWNERS = [
  { owner: "RASA", status: "AVAILABLE", label: "Open for sale" },
  { owner: "RASA", status: "BLOCKED", label: "Block" },
  { owner: "BOOKMYSHOW", status: "BLOCKED", label: "BookMyShow" },
  { owner: "VENUE", status: "BLOCKED", label: "Venue" },
  { owner: "VIP", status: "BLOCKED", label: "VIP" },
] as const;

const SEAT_W = 16;
const SEAT_H = 10;

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
  const [zoom, setZoom] = useState(2.4);

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

  const layout = useMemo(() => buildLayout(seats), [seats]);

  const selectedLabels = useMemo(() => {
    if (!layout) return [];
    return layout.placed
      .filter((seat) => picked.has(seat.id))
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((seat) => seat.seat.seatLabel);
  }, [layout, picked]);

  function toggle(id: string, status: string) {
    if (status === "BOOKED") return;
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
            Stage is at the bottom. The letter beside each row is the row, and the number inside each seat is the seat number. Click seats, then choose what to do with them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={zoom === 1 ? primaryButtonClass : quietButtonClass} onClick={() => setZoom(1)}>
            Whole hall
          </button>
          <button type="button" className={zoom === 2.4 ? primaryButtonClass : quietButtonClass} onClick={() => setZoom(2.4)}>
            Seat numbers
          </button>
          <p className="text-sm text-plum">{picked.size} selected</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        <Swatch className="bg-plum" label="Open" />
        <Swatch className="bg-[#d9cddb]" label="Blocked" />
        <Swatch className="bg-[#7aa2d4]" label="BookMyShow" />
        <Swatch className="bg-[#7dba8a]" label="Venue" />
        <Swatch className="bg-[#c9a227]" label="VIP" />
        <Swatch className="bg-[#e8b84a]" label="Held" />
        <Swatch className="bg-burg" label="Booked" />
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
      <div className="mt-3 max-h-[72vh] overflow-auto rounded-rasa bg-tint p-3">
        {layout ? (
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="mx-auto h-auto"
            style={{ width: zoom === 1 ? "100%" : layout.width * zoom }}
          >
            {layout.sections.map((section) => (
              <text
                key={section.key}
                x={section.x - layout.minX}
                y={section.y - layout.minY}
                textAnchor="middle"
                fontSize="12"
                fontFamily="Barlow Condensed, Arial, sans-serif"
                fill="#5b1f5d"
              >
                {section.name}
              </text>
            ))}
            {layout.rows.map((row) => (
              <text
                key={row.key}
                x={row.x - layout.minX}
                y={row.y - layout.minY}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="8"
                fontFamily="Barlow Condensed, Arial, sans-serif"
                fill="#241426"
              >
                {row.label}
              </text>
            ))}
            {layout.placed.map((seat) => {
              const selected = picked.has(seat.id);
              return (
                <g
                  key={seat.id}
                  className={seat.status === "BOOKED" ? "cursor-not-allowed" : "cursor-pointer"}
                  onClick={() => toggle(seat.id, seat.status)}
                >
                  <rect
                    x={seat.x - layout.minX}
                    y={seat.y - layout.minY}
                    width={SEAT_W}
                    height={SEAT_H}
                    rx={1.5}
                    fill={colorFor(seat)}
                    stroke={selected ? "#241426" : seat.seat.seatType === "WHEELCHAIR" ? "#931929" : "#ffffff"}
                    strokeWidth={selected ? 1.6 : 0.6}
                  />
                  <text
                    x={seat.x - layout.minX + SEAT_W / 2}
                    y={seat.y - layout.minY + SEAT_H / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="6.2"
                    fontFamily="Barlow Condensed, Arial, sans-serif"
                    fontWeight="600"
                    fill={inkFor(seat)}
                    pointerEvents="none"
                  >
                    {seat.seat.seatNumber}
                  </text>
                  <title>{`${seat.seat.seatLabel} · ${seat.seat.section.sectionName} · ${seat.allocationOwner} · ${seat.status}`}</title>
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="text-sm text-muted">Loading the auditorium…</p>
        )}
        <p className="mt-2 text-center font-lab text-xs tracking-[0.14em] text-plum uppercase">Stage</p>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm text-muted">
          Price for the selected seats
          <input className={fieldClass} type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Leave blank to keep" />
        </label>
        {OWNERS.map((action) => (
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

function buildLayout(seats: SeatRow[]) {
  const placed = seats.flatMap((seat) => {
    const x = Number(seat.seat.xPosition);
    const y = Number(seat.seat.yPosition);
    if (Number.isNaN(x) || Number.isNaN(y)) return [];
    return [{ ...seat, x, y }];
  });
  if (placed.length === 0) return null;

  const bySection = new Map<string, PlacedSeat[]>();
  for (const seat of placed) {
    const code = seat.seat.section?.sectionCode ?? "section";
    const group = bySection.get(code);
    if (group) group.push(seat);
    else bySection.set(code, [seat]);
  }

  const sections: { key: string; name: string; x: number; y: number }[] = [];
  const rows: { key: string; label: string; x: number; y: number }[] = [];
  for (const [code, group] of bySection) {
    const minX = Math.min(...group.map((seat) => seat.x));
    const maxX = Math.max(...group.map((seat) => seat.x));
    const minY = Math.min(...group.map((seat) => seat.y));
    sections.push({
      key: code,
      name: group[0].seat.section?.sectionName ?? code,
      x: (minX + maxX + SEAT_W) / 2,
      y: minY - 12,
    });
    const byRow = new Map<string, PlacedSeat[]>();
    for (const seat of group) {
      const row = byRow.get(seat.seat.rowLabel);
      if (row) row.push(seat);
      else byRow.set(seat.seat.rowLabel, [seat]);
    }
    for (const [label, rowSeats] of byRow) {
      rows.push({
        key: `${code}-${label}`,
        label,
        x: Math.min(...rowSeats.map((seat) => seat.x)) - 4,
        y: rowSeats[0].y + SEAT_H / 2,
      });
    }
  }

  const minX = Math.min(...placed.map((seat) => seat.x)) - 32;
  const minY = Math.min(...placed.map((seat) => seat.y)) - 26;
  const maxX = Math.max(...placed.map((seat) => seat.x)) + SEAT_W + 12;
  const maxY = Math.max(...placed.map((seat) => seat.y)) + SEAT_H + 16;
  return { placed, sections, rows, minX, minY, width: maxX - minX, height: maxY - minY };
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block size-3 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function colorFor(seat: SeatRow) {
  if (seat.status === "BOOKED") return "#931929";
  if (seat.status === "HELD") return "#e8b84a";
  if (seat.status === "AVAILABLE") return "#5b1f5d";
  if (seat.allocationOwner === "BOOKMYSHOW") return "#7aa2d4";
  if (seat.allocationOwner === "VENUE") return "#7dba8a";
  if (seat.allocationOwner === "VIP") return "#c9a227";
  return "#d9cddb";
}

function inkFor(seat: SeatRow) {
  if (seat.status === "BOOKED" || seat.status === "AVAILABLE") return "#ffffff";
  return "#241426";
}
