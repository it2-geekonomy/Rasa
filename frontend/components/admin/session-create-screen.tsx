"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { fieldClass, labelClass, Notice, Panel, primaryButtonClass, quietButtonClass } from "./ui";

type Venue = { id: string; name: string; venueType: string };
type EventDetail = { id: string; title: string; bookingMode: string };

export function SessionCreateScreen({ eventId }: { eventId: string }) {
  const { token } = useAdmin();
  const router = useRouter();
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

  useEffect(() => {
    Promise.all([
      api<{ data: EventDetail }>(`/events/${eventId}`, { token }),
      api<{ data: Venue[] }>("/venues?limit=20", { token }),
    ])
      .then(([detail, venueList]) => {
        setEvent(detail.data);
        setVenues(venueList.data);
        setForm((current) => ({ ...current, venueId: venueList.data[0]?.id ?? "" }));
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the event"));
  }, [eventId, token]);

  const venue = venues.find((item) => item.id === form.venueId);
  const seatVenue = venue?.venueType === "RESERVED_SEATING";
  const slotVenue = Boolean(venue) && !seatVenue;
  const needsSlots = slotVenue && event?.bookingMode === "CAPACITY_BASED";
  const mismatch =
    (seatVenue && event?.bookingMode !== "SEAT_BASED") ||
    (slotVenue && event?.bookingMode === "SEAT_BASED");

  async function create(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (!event) return;
    setPending(true);
    setError("");
    try {
      const result = await api<{ data: { id: string } }>("/sessions", {
        method: "POST",
        token,
        body: {
          eventId,
          venueId: form.venueId,
          sessionName: form.sessionName || undefined,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          price: Number(form.price || 0),
          ...(needsSlots ? { capacity: Number(form.capacity) } : {}),
        },
      });
      router.replace(`/admin/sessions/${result.data.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create the session");
      setPending(false);
    }
  }

  return (
    <>
      <div>
        <Link href={`/admin/events/${eventId}`} className="text-sm text-plum no-underline">
          {event?.title || "Event"}
        </Link>
        <h1 className="font-display text-3xl text-plum">Add session</h1>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <Panel title="New session">
        <form onSubmit={create} className="grid gap-3 md:grid-cols-2">
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
          {needsSlots ? (
            <label className={labelClass}>
              Number of slots
              <input className={fieldClass} type="number" min="1" value={form.capacity} onChange={(item) => setForm({ ...form, capacity: item.target.value })} required />
            </label>
          ) : null}
          <div className="flex gap-2 md:col-span-2">
            <button className={primaryButtonClass} disabled={pending || !event || mismatch || (needsSlots && !form.capacity)}>
              {pending ? "Saving…" : "Create session"}
            </button>
            <Link href={`/admin/events/${eventId}`} className={`${quietButtonClass} no-underline`}>
              Cancel
            </Link>
          </div>
          {mismatch ? (
            <p className="text-sm text-burg md:col-span-2">
              {seatVenue
                ? "The Auditorium uses seat blocks. Set this event to seat-based booking before adding the session."
                : "Seat blocks are only for the Auditorium. Set this event to slot booking before using this venue."}
            </p>
          ) : seatVenue ? (
            <p className="text-sm text-muted md:col-span-2">The 1,075 auditorium seats are copied in as blocked. Open the ones you want to sell on the session page.</p>
          ) : slotVenue ? (
            <p className="text-sm text-muted md:col-span-2">
              {event?.bookingMode === "FREE_ENTRY"
                ? "This venue has no seat map. Entry is free, and a slot count is optional."
                : "People book a number of these slots. There is no seat map for this venue."}
            </p>
          ) : null}
        </form>
      </Panel>
    </>
  );
}
