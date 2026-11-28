"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type PageMeta } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { EyeIcon, fieldClass, formatEnum, Notice, primaryButtonClass, quietButtonClass } from "./ui";

type EventRow = {
  id: string;
  title: string;
  category: string;
  bookingMode: string;
  status: string;
  _count: { sessions: number };
};

const PAGE_SIZE = 10;

export function EventsScreen() {
  const { token } = useAdmin();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [bookingMode, setBookingMode] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
    if (search.trim()) query.set("search", search.trim());
    if (bookingMode) query.set("bookingMode", bookingMode);
    if (status) query.set("status", status);
    if (category) query.set("category", category);
    const load = () => {
      api<{ data: EventRow[]; meta: PageMeta }>(`/events?${query}`, { token })
        .then((result) => {
          if (!cancel) {
            setRows(result.data);
            setMeta(result.meta);
          }
        })
        .catch((caught) => {
          if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load events");
        });
    };
    if (!search.trim()) {
      load();
      return () => {
        cancel = true;
      };
    }
    const handle = window.setTimeout(load, 200);
    return () => {
      cancel = true;
      window.clearTimeout(handle);
    };
  }, [token, page, search, bookingMode, status, category]);

  const totalPages = Math.max(meta?.totalPages ?? 1, 1);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-plum">Events</h1>
          <p className="mt-1 text-sm text-muted">{meta ? `${meta.total} events` : "Loading events…"}</p>
        </div>
        <Link href="/admin/events/new" className={`${primaryButtonClass} no-underline`}>
          Create event
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${fieldClass} !w-full sm:!w-64 shrink-0`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search event title…"
        />
        <select
          className={`${fieldClass} !w-auto shrink-0`}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          <option value="Performance">Performance</option>
          <option value="Workshop">Workshop</option>
          <option value="Wellness">Wellness</option>
          <option value="Art">Art</option>
          <option value="Food">Food</option>
        </select>
        <select
          className={`${fieldClass} !w-auto shrink-0`}
          value={bookingMode}
          onChange={(e) => {
            setBookingMode(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by booking mode"
        >
          <option value="">All modes</option>
          <option value="SEAT_BASED">Seat based</option>
          <option value="CAPACITY_BASED">Capacity based</option>
          <option value="FREE_ENTRY">Free entry</option>
        </select>
        <select
          className={`${fieldClass} !w-auto shrink-0`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Mode</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Sessions</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <p className="font-medium text-plum">{row.title}</p>
                  <p className="text-xs text-muted">{row.category}</p>
                </td>
                <td className="px-3 py-2">{formatEnum(row.bookingMode)}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row._count.sessions}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/events/${row.id}`}
                    aria-label={`View ${row.title}`}
                    title="View"
                    className="inline-flex size-8 items-center justify-center rounded-rasa text-plum hover:bg-tint"
                  >
                    <EyeIcon />
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={5}>
                  No events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button type="button" className={`${quietButtonClass} disabled:cursor-not-allowed disabled:opacity-50`} disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </button>
          <button type="button" className={`${quietButtonClass} disabled:cursor-not-allowed disabled:opacity-50`} disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      </div>
    </>
  );
}
