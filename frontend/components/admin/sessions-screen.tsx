"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, inr, when, type PageMeta } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { EyeIcon, fieldClass, formatEnum, Notice, quietButtonClass, statusBadgeClass } from "./ui";

type SessionRow = {
  id: string;
  sessionName: string | null;
  startAt: string;
  endAt: string;
  price: string;
  status: string;
  event: { id: string; title: string; bookingMode: string };
  venue: { name: string };
};

type VenueOption = { id: string; name: string };

const PAGE_SIZE = 10;

export function SessionsScreen() {
  const { token } = useAdmin();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [venueId, setVenueId] = useState("");
  const [status, setStatus] = useState("");
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: VenueOption[] }>("/venues?limit=50", { token })
      .then((result) => setVenues(result.data))
      .catch(() => null);
  }, [token]);

  useEffect(() => {
    let cancel = false;
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
    if (search.trim()) query.set("search", search.trim());
    if (venueId) query.set("venueId", venueId);
    if (status) query.set("status", status);
    const load = () => {
      api<{ data: SessionRow[]; meta: PageMeta }>(`/sessions?${query}`, { token })
        .then((result) => {
          if (!cancel) {
            setRows(result.data);
            setMeta(result.meta);
          }
        })
        .catch((caught) => {
          if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load sessions");
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
  }, [token, page, search, venueId, status]);

  const totalPages = Math.max(meta?.totalPages ?? 1, 1);

  return (
    <>
      <div>
        <h1 className="font-display text-3xl text-plum">Sessions</h1>
        <p className="mt-1 text-sm text-muted">
          {meta ? `${meta.total} sessions · Open one to set seats, price, or capacity.` : "Loading sessions…"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${fieldClass} !w-full sm:!w-64 shrink-0`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search session, show, or venue…"
        />
        <select
          className={`${fieldClass} !w-auto shrink-0`}
          value={venueId}
          onChange={(e) => {
            setVenueId(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by venue"
        >
          <option value="">All venues</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
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
          <option value="SCHEDULED">Scheduled</option>
          <option value="OPEN">Open</option>
          <option value="SOLD_OUT">Sold out</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">Session</th>
              <th className="px-3 py-2 font-medium">Show</th>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Venue</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line hover:bg-tint/40">
                <td className="px-3 py-2.5">
                  <p className="font-medium text-plum">{row.sessionName || "Session"}</p>
                  <p className="text-xs text-muted">{formatEnum(row.event.bookingMode)}</p>
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/admin/events/${row.event.id}`} className="text-plum no-underline hover:underline">
                    {row.event.title}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-ink">{when(row.startAt)}</p>
                  <p className="text-xs text-muted">until {when(row.endAt)}</p>
                </td>
                <td className="px-3 py-2.5">{row.venue.name}</td>
                <td className="px-3 py-2.5 font-medium text-ink">{inr(row.price)}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}>
                    {formatEnum(row.status)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/admin/sessions/${row.id}`}
                    aria-label={`View ${row.sessionName || "session"}`}
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
                <td className="px-3 py-4 text-muted" colSpan={7}>
                  No sessions yet. Create one from an event.
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
          <button
            type="button"
            className={`${quietButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className={`${quietButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
