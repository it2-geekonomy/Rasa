"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { inr } from "@/lib/admin/api";
import { Panel } from "./ui";

export type ChartSlice = {
  id: string;
  label: string;
  value: number;
  amount?: number;
  color: string;
};

export type SessionInventoryBar = {
  sessionId: string;
  label: string;
  sublabel: string;
  total: number;
  available: number;
  booked: number;
  held: number;
  partner: number;
  blocked: number;
};

export type DayMetric = {
  key: string;
  label: string;
  sessions: number;
  bookings: number;
  tickets: number;
  revenue: number;
};

export function DonutBreakdownPanel({
  datasets,
}: {
  datasets: {
    id: "seats" | "bookings" | "payments";
    label: string;
    centerTitle: string;
    centerValue: string;
    emptyText: string;
    slices: ChartSlice[];
  }[];
}) {
  const [tab, setTab] = useState<"seats" | "bookings" | "payments">(datasets[0]?.id ?? "seats");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const active = datasets.find((d) => d.id === tab) ?? datasets[0];
  const nonZero = useMemo(() => active.slices.filter((s) => s.value > 0), [active]);
  const total = useMemo(() => nonZero.reduce((sum, s) => sum + s.value, 0), [nonZero]);
  const hovered = nonZero.find((s) => s.id === hoveredId) ?? null;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const arcs = useMemo(() => {
    if (total <= 0) return [];
    let offset = 0;
    return nonZero.map((slice) => {
      const length = (slice.value / total) * circumference;
      const item = {
        ...slice,
        dasharray: `${length} ${circumference - length}`,
        dashoffset: -offset,
      };
      offset += length;
      return item;
    });
  }, [nonZero, total, circumference]);

  return (
    <Panel title="Distribution">
      <div className="-mt-1 mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Interactive split across inventory, orders, and payments.</p>
        <div className="inline-flex rounded-rasa border border-line bg-tint p-0.5 text-xs">
          {datasets.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setTab(d.id);
                setHoveredId(null);
              }}
              className={`rounded-[9px] px-2.5 py-1 font-medium transition ${
                tab === d.id ? "bg-white text-plum shadow-xs" : "text-muted hover:text-plum"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="grid min-h-[210px] place-items-center rounded-rasa border border-dashed border-line bg-tint/40 p-6 text-center text-sm text-muted">
          {active.emptyText}
        </div>
      ) : (
        <div className="grid items-center gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div className="relative mx-auto size-[168px]">
            <svg viewBox="0 0 160 160" className="size-full -rotate-90" role="img" aria-label={`${active.label} distribution chart`}>
              <circle cx="80" cy="80" r={radius} fill="none" stroke="#f6f0f6" strokeWidth="22" />
              {arcs.map((arc) => {
                const dimmed = hoveredId !== null && hoveredId !== arc.id;
                return (
                  <circle
                    key={arc.id}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={hoveredId === arc.id ? 26 : 22}
                    strokeDasharray={arc.dasharray}
                    strokeDashoffset={arc.dashoffset}
                    className="cursor-pointer transition-all duration-150"
                    style={{ opacity: dimmed ? 0.35 : 1 }}
                    onMouseEnter={() => setHoveredId(arc.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <span className="font-lab text-[11px] font-semibold tracking-wider text-muted uppercase">
                {hovered ? hovered.label : active.centerTitle}
              </span>
              <span className="mt-0.5 font-display text-xl leading-tight font-semibold text-plum">
                {hovered ? hovered.value.toLocaleString("en-IN") : active.centerValue}
              </span>
              {hovered ? (
                <span className="text-[11px] text-muted">
                  {Math.round((hovered.value / total) * 100)}%
                </span>
              ) : null}
            </div>
          </div>

          <ul className="grid gap-2 text-sm">
            {active.slices.map((slice) => {
              const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
              const activeRow = hoveredId === slice.id;
              return (
                <li
                  key={slice.id}
                  onMouseEnter={() => slice.value > 0 && setHoveredId(slice.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 transition ${
                    activeRow ? "border-plum/30 bg-tint" : "border-line/70 bg-white"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                    <span className="truncate font-medium text-ink">{slice.label}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    <b className="font-semibold text-plum">{slice.value.toLocaleString("en-IN")}</b>{" "}
                    {slice.amount !== undefined ? `· ${inr(slice.amount)}` : `(${pct}%)`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}

const SEAT_SEGMENTS = [
  { key: "booked", label: "Booked", color: "#931929" },
  { key: "held", label: "Held", color: "#e8b84a" },
  { key: "available", label: "Open (RASA)", color: "#5b1f5d" },
  { key: "partner", label: "Partner / VIP", color: "#6366f1" },
  { key: "blocked", label: "Blocked", color: "#d4c5d6" },
] as const;

export function SeatInventoryBarsPanel({ items }: { items: SessionInventoryBar[] }) {
  return (
    <Panel title="Auditorium seat inventory">
      <div className="-mt-1 mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Seat allocation status across seat-based sessions. Click a session to edit seats.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted">
        {SEAT_SEGMENTS.map((seg) => (
          <span key={seg.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
            {seg.label}
          </span>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="grid min-h-[180px] place-items-center rounded-rasa border border-dashed border-line bg-tint/40 p-6 text-center text-sm text-muted">
          No seat-based sessions scheduled yet.
        </div>
      ) : (
        <div className="grid gap-3.5">
          {items.map((item) => {
            const total = Math.max(item.total, 1);
            return (
              <Link
                key={item.sessionId}
                href={`/admin/sessions/${item.sessionId}`}
                className="group block rounded-lg border border-line/80 bg-white p-3 no-underline transition hover:border-plum"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-plum group-hover:underline">{item.label}</p>
                    <p className="truncate text-xs text-muted">{item.sublabel}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted tabular-nums">
                    <b className="font-semibold text-plum">{item.available.toLocaleString("en-IN")}</b> open ·{" "}
                    <b className="font-semibold text-burg">{item.booked.toLocaleString("en-IN")}</b> booked / {item.total.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-tint">
                  {SEAT_SEGMENTS.map((seg) => {
                    const count = item[seg.key];
                    if (count <= 0) return null;
                    const widthPct = (count / total) * 100;
                    return (
                      <div
                        key={seg.key}
                        title={`${seg.label}: ${count.toLocaleString("en-IN")}`}
                        style={{ width: `${widthPct}%`, backgroundColor: seg.color }}
                      />
                    );
                  })}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export function ScheduleActivityChartPanel({ days }: { days: DayMetric[] }) {
  const [metric, setMetric] = useState<"sessions" | "bookings" | "revenue">("sessions");

  const maxVal = useMemo(() => {
    const vals = days.map((d) => d[metric]);
    return Math.max(...vals, 1);
  }, [days, metric]);

  return (
    <Panel title="Festival timeline">
      <div className="-mt-1 mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Activity grouped by session date.</p>
        <div className="inline-flex rounded-rasa border border-line bg-tint p-0.5 text-xs">
          {(
            [
              ["sessions", "Sessions"],
              ["bookings", "Bookings"],
              ["revenue", "Revenue"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMetric(id)}
              className={`rounded-[9px] px-2.5 py-1 font-medium transition ${
                metric === id ? "bg-white text-plum shadow-xs" : "text-muted hover:text-plum"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {days.length === 0 ? (
        <div className="grid min-h-[200px] place-items-center rounded-rasa border border-dashed border-line bg-tint/40 p-6 text-center text-sm text-muted">
          No scheduled session dates yet.
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] items-end gap-3 rounded-rasa border border-line bg-tint/40 px-4 pt-6 pb-4">
            {days.map((day) => {
              const raw = day[metric];
              const pct = raw > 0 ? Math.max((raw / maxVal) * 100, 10) : 4;
              const formatted = metric === "revenue" ? inr(raw) : raw.toLocaleString("en-IN");
              return (
                <div key={day.key} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-plum tabular-nums">{formatted}</span>
                  <div className="flex h-36 w-full max-w-[52px] items-end justify-center rounded-t-lg bg-white/80 p-1">
                    <div
                      className="w-full rounded-md transition-all duration-300"
                      style={{
                        height: `${pct}%`,
                        background:
                          raw > 0
                            ? metric === "revenue"
                              ? "#931929"
                              : "#5b1f5d"
                            : "#e3d5e4",
                      }}
                      title={`${day.label}: ${formatted}`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-ink">{day.label}</p>
                    <p className="text-[11px] text-muted tabular-nums">
                      {day.sessions} {day.sessions === 1 ? "show" : "shows"} · {day.tickets} tkt
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}
