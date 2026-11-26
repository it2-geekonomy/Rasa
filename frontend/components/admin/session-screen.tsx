"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, when } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { AdminSeatMap } from "./seat-map";
import { fieldClass, labelClass, Notice, Panel, primaryButtonClass } from "./ui";

type SessionDetail = {
  id: string;
  sessionName: string | null;
  startAt: string;
  endAt: string;
  price: string;
  capacity: number | null;
  status: string;
  event: { id: string; title: string; bookingMode: string };
  venue: { name: string };
};
type Count = { allocationOwner: string; status: string; count: number };
export function SessionScreen({ sessionId }: { sessionId: string }) {
  const { token } = useAdmin();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [counts, setCounts] = useState<Count[]>([]);
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

  async function load() {
    const detail = await api<{ data: SessionDetail }>(`/sessions/${sessionId}`, { token });
    setSession(detail.data);
    setCapacity(detail.data.capacity == null ? "" : String(detail.data.capacity));
    setPrice(String(detail.data.price));
    if (detail.data.event.bookingMode === "SEAT_BASED") {
      const summary = await api<{ data: { counts: Count[] } }>(`/sessions/${sessionId}/inventory`, { token });
      setCounts(summary.data.counts);
    }
  }

  useEffect(() => {
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the session"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

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

  if (!session && !error) return <p className="text-sm text-muted">Loading session…</p>;

  return (
    <>
      <div>
        <Link href={session ? `/admin/events/${session.event.id}` : "/admin/events"} className="text-sm text-plum no-underline">
          {session?.event.title}
        </Link>
        <h1 className="font-display text-3xl text-plum">{session?.sessionName || "Session"}</h1>
        <p className="text-sm text-muted">
          {session?.venue.name} · {when(session?.startAt)} · {session?.event.bookingMode}
        </p>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      {message ? <p className="text-sm text-plum">{message}</p> : null}
      {session?.event.bookingMode === "CAPACITY_BASED" || session?.event.bookingMode === "FREE_ENTRY" ? (
        <Panel title="Capacity and price">
          <form onSubmit={saveCapacity} className="grid gap-3 md:grid-cols-3">
            <label className={labelClass}>
              Capacity
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
      {session?.event.bookingMode === "SEAT_BASED" ? (
        <>
          <Panel title="Seat allocation">
            <p className="mb-3 text-sm text-muted">
              {counts.map((item) => `${item.allocationOwner} ${item.status}: ${item.count}`).join(" · ") || "No seats copied yet."}
            </p>
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
