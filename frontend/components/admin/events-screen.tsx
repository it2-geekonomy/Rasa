"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { fieldClass, labelClass, Notice, Panel, primaryButtonClass } from "./ui";

type EventRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  eventType: string;
  bookingMode: string;
  status: string;
  _count: { sessions: number };
};

const CATEGORIES = ["Performance", "Workshop", "Wellness", "Art", "Food"];
const TYPES = ["PERFORMANCE", "WORKSHOP", "EXHIBITION", "WELLNESS", "OTHER"];
const MODES = ["SEAT_BASED", "CAPACITY_BASED", "FREE_ENTRY"];

export function EventsScreen() {
  const { token } = useAdmin();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "Performance",
    eventType: "PERFORMANCE",
    bookingMode: "SEAT_BASED",
    shortDescription: "",
  });

  async function load() {
    const result = await api<{ data: EventRow[] }>("/events?limit=100", { token });
    setRows(result.data);
  }

  useEffect(() => {
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load events"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/events", { method: "POST", token, body: form });
      setForm({ ...form, title: "", shortDescription: "" });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create the event");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl text-plum">Events</h1>
      {error ? <Notice>{error}</Notice> : null}
      <Panel title="New event">
        <form onSubmit={create} className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>
            Title
            <input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label className={labelClass}>
            Category
            <select className={fieldClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Type
            <select className={fieldClass} value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value })}>
              {TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Booking
            <select className={fieldClass} value={form.bookingMode} onChange={(event) => setForm({ ...form, bookingMode: event.target.value })}>
              {MODES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Short description
            <input className={fieldClass} value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} />
          </label>
          <div>
            <button className={primaryButtonClass} type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create event"}
            </button>
          </div>
        </form>
      </Panel>
      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Mode</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <Link href={`/admin/events/${row.id}`} className="font-medium text-plum no-underline">
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted">{row.category}</p>
                </td>
                <td className="px-3 py-2">{row.bookingMode}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row._count.sessions}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={4}>
                  No events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
