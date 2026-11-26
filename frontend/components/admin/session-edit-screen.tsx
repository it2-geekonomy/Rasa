"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { BackIcon, fieldClass, labelClass, Notice, Panel, primaryButtonClass, quietButtonClass } from "./ui";

const STATUSES = ["SCHEDULED", "OPEN", "SOLD_OUT", "CANCELLED", "COMPLETED"];

type Venue = { id: string; name: string };

type SessionDetail = {
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

function toLocalDateTimeInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SessionEditScreen({ sessionId }: { sessionId: string }) {
  const { token } = useAdmin();
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookingMode, setBookingMode] = useState("SEAT_BASED");
  const [originalVenueId, setOriginalVenueId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({
    venueId: "",
    sessionName: "",
    startAt: "",
    endAt: "",
    price: "0",
    capacity: "",
    status: "SCHEDULED",
  });

  useEffect(() => {
    Promise.all([
      api<{ data: SessionDetail }>(`/sessions/${sessionId}`, { token }),
      api<{ data: Venue[] }>("/venues?limit=20", { token }),
    ])
      .then(([detail, venueList]) => {
        const session = detail.data;
        setVenues(venueList.data);
        setBookingMode(session.event.bookingMode);
        setOriginalVenueId(session.venue.id);
        setForm({
          venueId: session.venue.id,
          sessionName: session.sessionName ?? "",
          startAt: toLocalDateTimeInput(session.startAt),
          endAt: toLocalDateTimeInput(session.endAt),
          price: String(session.price),
          capacity: session.capacity == null ? "" : String(session.capacity),
          status: session.status,
        });
        setReady(true);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the session"));
  }, [sessionId, token]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api(`/sessions/${sessionId}`, {
        method: "PATCH",
        token,
        body: {
          ...(form.venueId && form.venueId !== originalVenueId ? { venueId: form.venueId } : {}),
          sessionName: form.sessionName.trim() || undefined,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          price: Number(form.price || 0),
          ...(form.capacity !== "" ? { capacity: Number(form.capacity) } : {}),
          status: form.status,
        },
      });
      router.replace(`/admin/sessions/${sessionId}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update the session");
      setPending(false);
    }
  }

  if (!ready && !error) return <p className="text-sm text-muted">Loading session…</p>;

  return (
    <>
      <div>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-plum/80 no-underline hover:text-plum hover:underline"
        >
          <BackIcon />
          Session
        </Link>
        <h1 className="mt-1 font-display text-3xl text-plum">Update session</h1>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <Panel title={form.sessionName || "Session"}>
        <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>
            Name
            <input
              className={fieldClass}
              value={form.sessionName}
              onChange={(event) => setForm({ ...form, sessionName: event.target.value })}
              placeholder="Evening show"
            />
          </label>
          <label className={labelClass}>
            Venue
            <select
              className={fieldClass}
              value={form.venueId}
              onChange={(event) => setForm({ ...form, venueId: event.target.value })}
              required
            >
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Starts
            <input
              className={fieldClass}
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm({ ...form, startAt: event.target.value })}
              required
            />
          </label>
          <label className={labelClass}>
            Ends
            <input
              className={fieldClass}
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm({ ...form, endAt: event.target.value })}
              required
            />
          </label>
          <label className={labelClass}>
            Price
            <input
              className={fieldClass}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            Status
            <select
              className={fieldClass}
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          {bookingMode !== "SEAT_BASED" ? (
            <label className={labelClass}>
              Number of slots
              <input
                className={fieldClass}
                type="number"
                min="1"
                value={form.capacity}
                onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                required={bookingMode === "CAPACITY_BASED"}
              />
            </label>
          ) : null}
          <div className="flex gap-2 md:col-span-2">
            <button className={primaryButtonClass} type="submit" disabled={pending || !ready}>
              {pending ? "Saving…" : "Update session"}
            </button>
            <Link href={`/admin/sessions/${sessionId}`} className={`${quietButtonClass} no-underline`}>
              Cancel
            </Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
