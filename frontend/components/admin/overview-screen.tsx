"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, clearAdminApiCache, inr, when, type PageMeta } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import {
  DonutBreakdownPanel,
  ScheduleActivityChartPanel,
  SeatInventoryBarsPanel,
  type DayMetric,
  type SessionInventoryBar,
} from "./overview-charts";
import { EyeIcon, formatEnum, Notice, Panel, primaryButtonClass, quietButtonClass, statusBadgeClass } from "./ui";

type EventRow = {
  id: string;
  title: string;
  category: string;
  bookingMode: string;
  status: string;
  _count: { sessions: number };
};

type SessionRow = {
  id: string;
  sessionName: string | null;
  startAt: string;
  endAt: string;
  price: string;
  capacity: number | null;
  status: string;
  event: { id: string; title: string; bookingMode: string };
  venue: { id: string; name: string };
};

type BookingRow = {
  id: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  quantity: number;
  totalAmount: string;
  bookingStatus: string;
  paymentStatus: string;
  createdAt: string;
  session: { id: string; sessionName: string | null; startAt: string; event: { title: string } };
};

type PaymentRow = {
  id: string;
  amount: string;
  status: string;
  createdAt: string;
};

type VenueRow = {
  id: string;
  name: string;
};

type InventoryCount = {
  allocationOwner: string;
  status: string;
  count: number;
};

type SessionInventory = {
  sessionId: string;
  total: number;
  counts: InventoryCount[];
};

type DashboardData = {
  events: EventRow[];
  eventsTotal: number;
  sessions: SessionRow[];
  sessionsTotal: number;
  bookings: BookingRow[];
  bookingsTotal: number;
  payments: PaymentRow[];
  paymentsTotal: number;
  venuesTotal: number;
  inventories: SessionInventory[];
  loadedAt: string;
};

async function fetchPaged<T>(path: string, token: string, maxPages = 5) {
  const first = await api<{ data: T[]; meta: PageMeta }>(`${path}?limit=100&page=1`, { token });
  const pagesToFetch = Math.min(first.meta.totalPages, maxPages);
  if (pagesToFetch <= 1) {
    return { data: first.data, total: first.meta.total };
  }
  const rest = await Promise.all(
    Array.from({ length: pagesToFetch - 1 }, (_, i) =>
      api<{ data: T[] }>(`${path}?limit=100&page=${i + 2}`, { token }),
    ),
  );
  return {
    data: [first.data, ...rest.map((r) => r.data)].flat(),
    total: first.meta.total,
  };
}

async function fetchDashboard(token: string): Promise<DashboardData> {
  const [eventsRes, sessionsRes, bookingsRes, paymentsRes, venuesRes] = await Promise.all([
    fetchPaged<EventRow>("/events", token),
    fetchPaged<SessionRow>("/sessions", token),
    fetchPaged<BookingRow>("/bookings", token),
    fetchPaged<PaymentRow>("/payments", token),
    api<{ data: VenueRow[]; meta: PageMeta }>("/venues?limit=20&page=1", { token }),
  ]);

  const seatSessions = sessionsRes.data.filter((s) => s.event.bookingMode === "SEAT_BASED").slice(0, 20);
  const inventories = await Promise.all(
    seatSessions.map(async (session) => {
      const res = await api<{ data: SessionInventory }>(`/sessions/${session.id}/inventory`, { token });
      return res.data;
    }),
  );

  return {
    events: eventsRes.data,
    eventsTotal: eventsRes.total,
    sessions: sessionsRes.data,
    sessionsTotal: sessionsRes.total,
    bookings: bookingsRes.data,
    bookingsTotal: bookingsRes.total,
    payments: paymentsRes.data,
    paymentsTotal: paymentsRes.total,
    venuesTotal: venuesRes.meta.total,
    inventories,
    loadedAt: new Date().toISOString(),
  };
}

function dayBucket(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { key: "unknown", label: "TBD", order: Number.MAX_SAFE_INTEGER };
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(date);
  return { key, label, order: new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() };
}

function ensureDay(dayMap: Map<string, DayMetric & { order: number }>, iso: string) {
  const b = dayBucket(iso);
  let curr = dayMap.get(b.key);
  if (!curr) {
    curr = {
      key: b.key,
      label: b.label,
      order: b.order,
      sessions: 0,
      bookings: 0,
      tickets: 0,
      revenue: 0,
    };
    dayMap.set(b.key, curr);
  }
  return curr;
}

const QUICK_LINKS = [
  ["/admin/events", "Events", "Create shows or workshops and edit details."],
  ["/admin/sessions", "Sessions", "Manage schedules, pricing, and seat layouts."],
  ["/admin/bookings", "Bookings", "Paid customers, attendees, and tickets."],
  ["/admin/checkin", "Check-in", "Scan a ticket QR with the camera."],
] as const;

export function OverviewScreen() {
  const { token } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetchDashboard(token)
      .then((result) => {
        if (!cancel) setData(result);
      })
      .catch((caught) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load the overview");
      });
    return () => {
      cancel = true;
    };
  }, [token]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setError("");
    clearAdminApiCache();
    fetchDashboard(token)
      .then((result) => setData(result))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not refresh the overview"))
      .finally(() => setRefreshing(false));
  }, [token]);

  const summary = useMemo(() => {
    if (!data) return null;

    const publishedEvents = data.events.filter((e) => e.status === "PUBLISHED").length;

    let capturedRevenue = 0;
    let capturedCount = 0;
    let pendingPayCount = 0;
    let pendingPayAmount = 0;
    let failedPayCount = 0;
    let failedPayAmount = 0;
    let refundedPayCount = 0;
    let refundedPayAmount = 0;

    for (const p of data.payments) {
      const amt = Number(p.amount) || 0;
      if (p.status === "CAPTURED") {
        capturedRevenue += amt;
        capturedCount += 1;
      } else if (p.status === "CREATED" || p.status === "AUTHORIZED") {
        pendingPayCount += 1;
        pendingPayAmount += amt;
      } else if (p.status === "FAILED") {
        failedPayCount += 1;
        failedPayAmount += amt;
      } else if (p.status === "REFUNDED") {
        refundedPayCount += 1;
        refundedPayAmount += amt;
      }
    }

    let confirmedBookings = 0;
    let pendingBookings = 0;
    let cancelledBookings = 0;
    let confirmedTickets = 0;
    for (const b of data.bookings) {
      if (b.bookingStatus === "CONFIRMED") {
        confirmedBookings += 1;
        confirmedTickets += b.quantity;
      } else if (b.bookingStatus === "PENDING") {
        pendingBookings += 1;
      } else {
        cancelledBookings += 1;
      }
    }

    let totalSeats = 0;
    let availableSeats = 0;
    let bookedSeats = 0;
    let heldSeats = 0;
    let partnerSeats = 0;
    let blockedSeats = 0;

    const invMap = new Map(data.inventories.map((inv) => [inv.sessionId, inv]));
    const seatBars: SessionInventoryBar[] = data.sessions
      .filter((s) => s.event.bookingMode === "SEAT_BASED")
      .map((s) => {
        const inv = invMap.get(s.id);
        let available = 0;
        let booked = 0;
        let held = 0;
        let partner = 0;
        let blocked = 0;
        for (const c of inv?.counts ?? []) {
          if (c.status === "BOOKED") booked += c.count;
          else if (c.status === "HELD") held += c.count;
          else if (c.allocationOwner === "RASA" && c.status === "AVAILABLE") available += c.count;
          else if (c.allocationOwner !== "RASA") partner += c.count;
          else blocked += c.count;
        }
        totalSeats += inv?.total ?? 0;
        availableSeats += available;
        bookedSeats += booked;
        heldSeats += held;
        partnerSeats += partner;
        blockedSeats += blocked;

        return {
          sessionId: s.id,
          label: s.event.title,
          sublabel: `${s.sessionName || "Session"} · ${when(s.startAt)}`,
          total: inv?.total ?? 0,
          available,
          booked,
          held,
          partner,
          blocked,
        };
      });

    const dayMap = new Map<string, DayMetric & { order: number }>();
    for (const s of data.sessions) {
      ensureDay(dayMap, s.startAt).sessions += 1;
    }
    for (const bk of data.bookings) {
      if (bk.bookingStatus !== "CONFIRMED") continue;
      const curr = ensureDay(dayMap, bk.session.startAt || bk.createdAt);
      curr.bookings += 1;
      curr.tickets += bk.quantity;
      curr.revenue += Number(bk.totalAmount) || 0;
    }
    const days = [...dayMap.values()].sort((a, b) => a.order - b.order);

    const recentBookings = data.bookings.filter((booking) => booking.bookingStatus === "CONFIRMED").slice(0, 6);

    return {
      publishedEvents,
      capturedRevenue,
      capturedCount,
      pendingPayCount,
      pendingPayAmount,
      failedPayCount,
      failedPayAmount,
      refundedPayCount,
      refundedPayAmount,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      confirmedTickets,
      totalSeats,
      availableSeats,
      bookedSeats,
      heldSeats,
      partnerSeats,
      blockedSeats,
      seatBars,
      days,
      recentBookings,
    };
  }, [data]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-plum">Festival desk</h1>
          <p className="mt-1 text-sm text-muted">
            {data
              ? `Live snapshot · Updated ${when(data.loadedAt)}`
              : "Loading live festival metrics…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={quietButtonClass}
            disabled={refreshing}
            onClick={refresh}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <Link href="/admin/events/new" className={`${primaryButtonClass} no-underline`}>
            Create event
          </Link>
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Captured revenue"
          value={summary ? inr(summary.capturedRevenue) : "—"}
          detail={summary ? `${summary.capturedCount} captured ${summary.capturedCount === 1 ? "payment" : "payments"}` : "Loading…"}
          tone="burg"
        />
        <KpiCard
          label="Confirmed bookings"
          value={summary ? summary.confirmedBookings.toLocaleString("en-IN") : "—"}
          detail={
            summary
              ? `${summary.confirmedTickets} ${summary.confirmedTickets === 1 ? "ticket" : "tickets"}`
              : "Loading…"
          }
          tone="plum"
        />
        <KpiCard
          label="Open seats (RASA)"
          value={summary ? summary.availableSeats.toLocaleString("en-IN") : "—"}
          detail={
            summary
              ? `${summary.bookedSeats.toLocaleString("en-IN")} booked · ${summary.totalSeats.toLocaleString("en-IN")} total`
              : "Loading…"
          }
          tone="plum"
        />
        <KpiCard
          label="Events & sessions"
          value={data ? `${summary?.publishedEvents ?? 0}/${data.eventsTotal}` : "—"}
          detail={data ? `${data.sessionsTotal} sessions · ${data.venuesTotal} venues` : "Loading…"}
          tone="muted"
        />
      </div>

      {summary ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <SeatInventoryBarsPanel items={summary.seatBars} />
            <DonutBreakdownPanel
              datasets={[
                {
                  id: "seats",
                  label: "Seat pool",
                  centerTitle: "Total seats",
                  centerValue: summary.totalSeats.toLocaleString("en-IN"),
                  emptyText: "No seat inventory found yet.",
                  slices: [
                    { id: "open", label: "Open (RASA)", value: summary.availableSeats, color: "#5b1f5d" },
                    { id: "booked", label: "Booked", value: summary.bookedSeats, color: "#931929" },
                    { id: "held", label: "Held", value: summary.heldSeats, color: "#e8b84a" },
                    { id: "partner", label: "Partner / VIP", value: summary.partnerSeats, color: "#6366f1" },
                    { id: "blocked", label: "Blocked", value: summary.blockedSeats, color: "#d4c5d6" },
                  ],
                },
                {
                  id: "bookings",
                  label: "Bookings",
                  centerTitle: "Paid bookings",
                  centerValue: summary.confirmedBookings.toLocaleString("en-IN"),
                  emptyText: "No paid bookings yet.",
                  slices: [
                    { id: "confirmed", label: "Paid", value: summary.confirmedBookings, color: "#10b981" },
                  ],
                },
                {
                  id: "payments",
                  label: "Payments",
                  centerTitle: "Captured",
                  centerValue: inr(summary.capturedRevenue),
                  emptyText: "No paid payments yet.",
                  slices: [
                    { id: "captured", label: "Captured", value: summary.capturedCount, amount: summary.capturedRevenue, color: "#10b981" },
                  ],
                },
              ]}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <ScheduleActivityChartPanel days={summary.days} />

            <Panel title="Recent bookings">
              <div className="-mt-1 mb-3 flex items-center justify-between gap-2">
                <p className="text-sm text-muted">Latest customers who paid.</p>
                <Link href="/admin/bookings" className="text-xs font-medium text-plum no-underline hover:underline">
                  All bookings
                </Link>
              </div>
              {summary.recentBookings.length === 0 ? (
                <div className="grid min-h-[140px] place-items-center rounded-rasa border border-dashed border-line bg-tint/40 p-5 text-center text-sm text-muted">
                  No paid bookings yet. They show up here after payment.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-rasa border border-line">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-tint2 text-plum">
                      <tr>
                        <th className="px-3 py-2 font-medium">Customer</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recentBookings.map((b) => (
                        <tr key={b.id} className="border-t border-line hover:bg-tint/40">
                          <td className="px-3 py-2">
                            <p className="font-medium text-ink">{b.customerName}</p>
                            <p className="text-xs text-muted">
                              {b.bookingReference} · {b.session.event.title}
                            </p>
                          </td>
                          <td className="px-3 py-2 font-medium text-ink">{inr(b.totalAmount)}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(b.bookingStatus)}`}>
                              {formatEnum(b.bookingStatus)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/admin/bookings/${b.id}`}
                              aria-label={`View booking ${b.bookingReference}`}
                              title="View booking"
                              className="inline-flex size-8 items-center justify-center rounded-rasa text-plum hover:bg-tint"
                            >
                              <EyeIcon />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map(([href, title, text]) => (
          <Link key={href} href={href} className="rounded-rasa border border-line bg-white p-4 no-underline transition hover:border-plum">
            <h2 className="font-display text-xl text-plum">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "plum" | "burg" | "muted";
}) {
  const accent =
    tone === "burg" ? "text-burg" : tone === "plum" ? "text-plum" : "text-ink";
  return (
    <div className="rounded-rasa border border-line bg-white p-4">
      <p className="font-lab text-xs font-semibold tracking-wider text-muted uppercase">{label}</p>
      <p className={`mt-1.5 font-display text-3xl leading-none font-semibold ${accent} tabular-nums`}>{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </div>
  );
}
