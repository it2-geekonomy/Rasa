"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, inr, when } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { fieldClass, labelClass, Notice, Panel, primaryButtonClass, quietButtonClass } from "./ui";

type Venue = { id: string; name: string; venueType: string };
type SessionRow = {
  id: string;
  sessionName: string | null;
  startAt: string;
  endAt: string;
  price: string;
  capacity: number | null;
  status: string;
  venue: { name: string };
};
type EventDetail = {
  id: string;
  title: string;
  status: string;
  bookingMode: string;
  category: string;
  sessions: SessionRow[];
};

export function EventDetailScreen({ eventId }: { eventId: string }) {
  const { token } = useAdmin();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    venueId: "",
    sessionName: "",
    startAt: "2027-01-08T18:30",
    endAt: "2027-01-08T21:00",
    price: "0",
    capacity: "",
  });

  async function load() {
    const [detail, venueList] = await Promise.all([
      api<{ data: EventDetail }>(`/events/${eventId}`, { token }),
      api<{ data: Venue[] }>("/venues?limit=20", { token }),
    ]);
    setEvent(detail.data);
    setVenues(venueList.data);
    setForm((current) => ({ ...current, venueId: current.venueId || venueList.data[0]?.id || "" }));
  }

  useEffect(() => {
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the event"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, token]);

  async function publish() {
    setError("");
    try {
      await api(`/events/${eventId}`, { method: "PATCH", token, body: { status: "PUBLISHED" } });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not publish");
    }
  }

  async function createSession(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (!event) return;
    setPending(true);
    setError("");
    try {
      await api("/sessions", {
        method: "POST",
        token,
        body: {
          eventId,
          venueId: form.venueId,
          sessionName: form.sessionName || undefined,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          price: Number(form.price || 0),
          ...(event.bookingMode === "CAPACITY_BASED" ? { capacity: Number(form.capacity) } : {}),
        },
      });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create the session");
    } finally {
      setPending(false);
    }
  }

  if (!event && !error) return <p className="text-sm text-muted">Loading event…</p>;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/events" className="text-sm text-plum no-underline">
            Events
          </Link>
          <h1 className="font-display text-3xl text-plum">{event?.title}</h1>
          <p className="text-sm text-muted">
            {event?.category} · {event?.bookingMode} · {event?.status}
          </p>
        </div>
        {event?.status === "DRAFT" ? (
          <button type="button" className={quietButtonClass} onClick={publish}>
            Publish
          </button>
        ) : null}
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <Panel title="Add a session">
        <form onSubmit={createSession} className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>
            Venue
            <select className={fieldClass} value={form.venueId} onChange={(item) => setForm({ ...form, venueId: item.target.value })} required>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Name
            <input className={fieldClass} value={form.sessionName} onChange={(item) => setForm({ ...form, sessionName: item.target.value })} placeholder="Evening show" />
          </label>
          <label className={labelClass}>
            Starts
            <input className={fieldClass} type="datetime-local" value={form.startAt} onChange={(item) => setForm({ ...form, startAt: item.target.value })} required />
          </label>
          <label className={labelClass}>
            Ends
            <input className={fieldClass} type="datetime-local" value={form.endAt} onChange={(item) => setForm({ ...form, endAt: item.target.value })} required />
          </label>
          <label className={labelClass}>
            Price
            <input className={fieldClass} type="number" min="0" step="0.01" value={form.price} onChange={(item) => setForm({ ...form, price: item.target.value })} />
          </label>
          {event?.bookingMode === "CAPACITY_BASED" ? (
            <label className={labelClass}>
              Capacity
              <input className={fieldClass} type="number" min="1" value={form.capacity} onChange={(item) => setForm({ ...form, capacity: item.target.value })} required />
            </label>
          ) : null}
          <div className="md:col-span-2">
            <button className={primaryButtonClass} disabled={pending}>
              {pending ? "Saving…" : "Create session"}
            </button>
            {event?.bookingMode === "SEAT_BASED" ? (
              <p className="mt-2 text-sm text-muted">Auditorium seats are copied in as blocked. Open them for sale on the session page.</p>
            ) : null}
          </div>
        </form>
      </Panel>
      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">Session</th>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {event?.sessions.map((session) => (
              <tr key={session.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <Link href={`/admin/sessions/${session.id}`} className="font-medium text-plum no-underline">
                    {session.sessionName || "Session"}
                  </Link>
                  <p className="text-xs text-muted">{session.venue.name}</p>
                </td>
                <td className="px-3 py-2">{when(session.startAt)}</td>
                <td className="px-3 py-2">{inr(session.price)}</td>
                <td className="px-3 py-2">{session.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
