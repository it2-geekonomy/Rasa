"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, inr, when } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { AdminSeatMap } from "./seat-map";
import {
  BackIcon,
  fieldClass,
  formatEnum,
  labelClass,
  Notice,
  Panel,
  primaryButtonClass,
  quietButtonClass,
  statusBadgeClass,
} from "./ui";

type SessionDetail = {
  id: string;
  sessionName: string | null;
  startAt: string;
  endAt: string;
  price: string;
  capacity: number | null;
  bookingOpenAt?: string | null;
  bookingCloseAt?: string | null;
  status: string;
  updatedAt?: string;
  event: { id: string; title: string; bookingMode: string; status?: string };
  venue: { id?: string; name: string; venueType?: string };
};

type Count = { allocationOwner: string; status: string; count: number };
type Slots = { capacity: number | null; confirmed: number; reserved: number; remaining: number | null };

async function fetchSessionBundle(sessionId: string, token: string) {
  const detail = await api<{ data: SessionDetail }>(`/sessions/${sessionId}`, { token });
  if (detail.data.event.bookingMode === "SEAT_BASED") {
    const inventory = await api<{ data: { counts: Count[] } }>(`/sessions/${sessionId}/inventory`, { token });
    return { session: detail.data, counts: inventory.data.counts, slots: null as Slots | null };
  }
  const availability = await api<{ data: Slots }>(`/sessions/${sessionId}/availability`, { token });
  return { session: detail.data, counts: [] as Count[], slots: availability.data };
}

export function SessionScreen({ sessionId }: { sessionId: string }) {
  const { token } = useAdmin();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [counts, setCounts] = useState<Count[]>([]);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [mapVersion, setMapVersion] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [allocation, setAllocation] = useState({
    sectionCode: "",
    rowLabel: "",
    seatNumberFrom: "",
    seatNumberTo: "",
    allocationOwner: "RASA",
    status: "AVAILABLE",
    price: "",
  });

  const applyBundle = useCallback((bundle: { session: SessionDetail; counts: Count[]; slots: Slots | null }) => {
    setSession(bundle.session);
    setCapacity(bundle.session.capacity == null ? "" : String(bundle.session.capacity));
    setPrice(String(bundle.session.price));
    setCounts(bundle.counts);
    setSlots(bundle.slots);
  }, []);

  const load = useCallback(async () => {
    const bundle = await fetchSessionBundle(sessionId, token);
    applyBundle(bundle);
  }, [sessionId, token, applyBundle]);

  useEffect(() => {
    let cancel = false;
    fetchSessionBundle(sessionId, token)
      .then((bundle) => {
        if (!cancel) applyBundle(bundle);
      })
      .catch((caught) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load the session");
      });
    return () => {
      cancel = true;
    };
  }, [sessionId, token, applyBundle]);

  async function saveCapacity(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api(`/sessions/${sessionId}`, {
        method: "PATCH",
        token,
        body: { price: Number(price), ...(capacity ? { capacity: Number(capacity) } : {}) },
      });
      setMessage("Session saved.");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the session");
    }
  }

  async function applyAllocation(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!allocation.sectionCode && !allocation.rowLabel.trim()) {
      setError("Choose a section or a row.");
      return;
    }
    try {
      const result = await api<{ data: { updated: number } }>(`/sessions/${sessionId}/seats`, {
        method: "PATCH",
        token,
        body: {
          ...(allocation.sectionCode ? { sectionCode: allocation.sectionCode } : {}),
          ...(allocation.rowLabel.trim() ? { rowLabel: allocation.rowLabel.trim() } : {}),
          ...(allocation.seatNumberFrom ? { seatNumberFrom: Number(allocation.seatNumberFrom) } : {}),
          ...(allocation.seatNumberTo ? { seatNumberTo: Number(allocation.seatNumberTo) } : {}),
          allocationOwner: allocation.allocationOwner,
          status: allocation.status,
          ...(allocation.price !== "" ? { price: Number(allocation.price) } : {}),
        },
      });
      setMessage(`${result.data.updated} seats updated.`);
      setMapVersion((version) => version + 1);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update seats");
    }
  }

  if (!session && !error) {
    return <p className="text-sm text-muted">Loading session…</p>;
  }

  if (!session) {
    return (
      <div className="grid gap-4">
        <div>
          <Link href="/admin/sessions" className="inline-flex items-center gap-1.5 text-sm font-medium text-plum no-underline hover:underline">
            <BackIcon />
            Back to sessions
          </Link>
        </div>
        <Notice>{error || "Session not found."}</Notice>
      </div>
    );
  }

  const totalSeats = counts.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/admin/sessions"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-plum/80 no-underline hover:text-plum hover:underline"
          >
            <BackIcon />
            Sessions
          </Link>
          <h1 className="mt-1 font-display text-3xl text-plum">{session.sessionName || "Session"}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(session.status)}`}>
              {formatEnum(session.status)}
            </span>
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-ink">
              {session.venue.name}
            </span>
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-muted">
              {formatEnum(session.event.bookingMode)}
            </span>
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-plum">
              {inr(session.price)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href={`/admin/events/${session.event.id}`} className={`${quietButtonClass} inline-flex items-center no-underline`}>
            View event
          </Link>
          <Link href={`/admin/sessions/${session.id}/edit`} className={`${primaryButtonClass} inline-flex items-center no-underline`}>
            Update
          </Link>
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}
      {message ? <p className="rounded-rasa bg-tint2 px-3 py-2 text-sm font-medium text-plum">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <Panel title="Session details">
          <dl className="divide-y divide-line text-sm">
            <div className="flex items-center justify-between gap-3 pb-2.5">
              <dt className="text-muted">Event</dt>
              <dd className="text-right">
                <Link href={`/admin/events/${session.event.id}`} className="font-medium text-plum no-underline hover:underline">
                  {session.event.title}
                </Link>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-muted">Venue</dt>
              <dd className="text-right font-medium text-ink">
                {session.venue.name}
                {session.venue.venueType ? ` · ${formatEnum(session.venue.venueType)}` : ""}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-muted">Starts</dt>
              <dd className="font-medium text-ink">{when(session.startAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2.5">
              <dt className="text-muted">Ends</dt>
              <dd className="font-medium text-ink">{when(session.endAt)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Session settings">
          <dl className="divide-y divide-line text-sm">
            <div className="flex items-center justify-between gap-3 pb-2.5">
              <dt className="text-muted">Status</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(session.status)}`}>
                  {formatEnum(session.status)}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-muted">Booking mode</dt>
              <dd className="font-medium text-ink">{formatEnum(session.event.bookingMode)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-muted">Base price</dt>
              <dd className="font-medium text-plum">{inr(session.price)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2.5">
              <dt className="text-muted">{session.event.bookingMode === "SEAT_BASED" ? "Seat inventory" : "Slots"}</dt>
              <dd className="text-right font-medium text-ink">
                {session.event.bookingMode === "SEAT_BASED"
                  ? `${totalSeats} seats`
                  : slots?.capacity != null
                    ? `${slots.remaining ?? 0} of ${slots.capacity} left`
                    : "Open entry"}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      {session.event.bookingMode === "CAPACITY_BASED" || session.event.bookingMode === "FREE_ENTRY" ? (
        <Panel title="Slots and price">
          <p className="mb-3 text-sm text-muted">
            People book a number of these slots.
            {slots?.capacity != null
              ? ` ${slots.confirmed} booked, ${slots.reserved} held, ${slots.remaining ?? 0} still open.`
              : " No slot limit is set."}
          </p>
          <form onSubmit={saveCapacity} className="grid gap-3 md:grid-cols-3">
            <label className={labelClass}>
              Number of slots
              <input className={fieldClass} type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
            </label>
            <label className={labelClass}>
              Price
              <input className={fieldClass} type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
            </label>
            <div className="self-end">
              <button className={primaryButtonClass}>Save</button>
            </div>
          </form>
        </Panel>
      ) : null}

      {session.event.bookingMode === "SEAT_BASED" ? (
        <>
          <Panel title="Seat allocation">
            <div className="mb-4 flex flex-wrap gap-2">
              {counts.length > 0 ? (
                counts.map((item) => (
                  <span
                    key={`${item.allocationOwner}-${item.status}`}
                    className="inline-flex items-center rounded-full border border-line bg-tint px-3 py-1 text-xs font-medium text-plum"
                  >
                    {item.allocationOwner} · {formatEnum(item.status)}: {item.count}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted">No seats copied yet.</p>
              )}
            </div>
            <form onSubmit={applyAllocation} className="grid gap-3 md:grid-cols-3">
              <label className={labelClass}>
                Section
                <select className={fieldClass} value={allocation.sectionCode} onChange={(event) => setAllocation({ ...allocation, sectionCode: event.target.value })}>
                  <option value="">Any</option>
                  {["UL", "UC", "UR", "LL", "LC", "LR"].map((code) => (
                    <option key={code}>{code}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Row
                <input className={fieldClass} value={allocation.rowLabel} onChange={(event) => setAllocation({ ...allocation, rowLabel: event.target.value })} placeholder="ZC" />
              </label>
              <label className={labelClass}>
                Owner
                <select className={fieldClass} value={allocation.allocationOwner} onChange={(event) => setAllocation({ ...allocation, allocationOwner: event.target.value })}>
                  {["RASA", "BOOKMYSHOW", "VENUE", "VIP"].map((owner) => (
                    <option key={owner}>{owner}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Seat from
                <input className={fieldClass} type="number" min="1" value={allocation.seatNumberFrom} onChange={(event) => setAllocation({ ...allocation, seatNumberFrom: event.target.value })} />
              </label>
              <label className={labelClass}>
                Seat to
                <input className={fieldClass} type="number" min="1" value={allocation.seatNumberTo} onChange={(event) => setAllocation({ ...allocation, seatNumberTo: event.target.value })} />
              </label>
              <label className={labelClass}>
                Status
                <select className={fieldClass} value={allocation.status} onChange={(event) => setAllocation({ ...allocation, status: event.target.value })}>
                  <option>AVAILABLE</option>
                  <option>BLOCKED</option>
                </select>
              </label>
              <label className={labelClass}>
                Seat price
                <input className={fieldClass} type="number" min="0" step="0.01" value={allocation.price} onChange={(event) => setAllocation({ ...allocation, price: event.target.value })} />
              </label>
              <div className="self-end md:col-span-2">
                <button className={primaryButtonClass}>Update seats</button>
              </div>
            </form>
          </Panel>
          <AdminSeatMap
            sessionId={sessionId}
            token={token}
            refreshKey={mapVersion}
            onChanged={(text) => {
              setMessage(text);
              setMapVersion((version) => version + 1);
              void load();
            }}
          />
        </>
      ) : null}
    </>
  );
}
