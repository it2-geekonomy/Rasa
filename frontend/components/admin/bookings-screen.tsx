"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, inr, when } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { EyeIcon, fieldClass, Notice, PaginationBar } from "./ui";

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
  session: { sessionName: string | null; event: { title: string } };
};

type SessionOption = {
  id: string;
  sessionName: string | null;
  event: { title: string; bookingMode: string };
};

export function BookingsScreen({
  mode = "SEAT_BASED",
}: {
  mode?: "SEAT_BASED" | "CAPACITY_BASED" | "FREE_ENTRY";
}) {
  const { token } = useAdmin();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const pageSize = 10;
  const isWorkshop = mode === "CAPACITY_BASED";
  const isFree = mode === "FREE_ENTRY";
  const heading = isFree
    ? "Open registrations"
    : isWorkshop
      ? "Workshop bookings"
      : "Bookings";
  const filterLabel = isFree
    ? "Filter by event"
    : isWorkshop
      ? "Filter by workshop"
      : "Filter by show";
  const allOptionLabel = isFree
    ? "All open events"
    : isWorkshop
      ? "All workshops"
      : "All shows";
  const itemColumnLabel = isFree ? "Event" : isWorkshop ? "Workshop" : "Show";
  const emptyText = isFree
    ? "No open-for-all registrations yet."
    : isWorkshop
      ? "No paid workshop bookings yet."
      : "No paid bookings yet.";

  useEffect(() => {
    api<{ data: SessionOption[] }>("/sessions?limit=50", { token })
      .then((result) =>
        setSessions(result.data.filter((s) => s.event.bookingMode === mode)),
      )
      .catch(() => null);
  }, [token, mode]);

  useEffect(() => {
    setPage(1);
  }, [search, sessionId, mode]);

  useEffect(() => {
    let cancel = false;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      bookingStatus: "CONFIRMED",
      bookingMode: mode,
    });
    if (sessionId) query.set("eventSessionId", sessionId);
    if (search.trim()) query.set("search", search.trim());
    const load = () => {
      api<{
        data: BookingRow[];
        meta?: { total: number; totalPages: number; page: number; limit: number };
      }>(`/bookings?${query}`, { token })
        .then((result) => {
          if (!cancel) {
            setRows(result.data);
            setTotal(result.meta?.total ?? result.data.length);
            setTotalPages(result.meta?.totalPages ?? 1);
          }
        })
        .catch((caught) => {
          if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load bookings");
        });
    };
    if (!search.trim()) {
      load();
      return () => {
        cancel = true;
      };
    }
    const handle = window.setTimeout(load, 250);
    return () => {
      cancel = true;
      window.clearTimeout(handle);
    };
  }, [search, token, mode, sessionId, page]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl text-plum">{heading}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${fieldClass} !w-full sm:!w-64 shrink-0`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, or reference"
          />
          <select
            className={`${fieldClass} !w-auto max-w-xs shrink-0`}
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            aria-label={filterLabel}
          >
            <option value="">{allOptionLabel}</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.event.title}
                {s.sessionName ? ` (${s.sessionName})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">Reference</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">{itemColumnLabel}</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line hover:bg-tint/40">
                <td className="px-3 py-2">
                  <p className="font-medium text-plum">{row.bookingReference}</p>
                  <p className="text-xs text-muted">{when(row.createdAt)}</p>
                </td>
                <td className="px-3 py-2">
                  {row.customerName}
                  <p className="text-xs text-muted">{row.customerEmail}</p>
                </td>
                <td className="px-3 py-2">
                  {row.session.event.title}
                  <p className="text-xs text-muted">{row.session.sessionName}</p>
                </td>
                <td className="px-3 py-2">{isFree ? "Registered" : "Paid"}</td>
                <td className="px-3 py-2">
                  {isFree ? "Free" : inr(row.totalAmount)}
                  <p className="text-xs text-muted">{row.quantity}</p>
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/bookings/${row.id}`}
                    aria-label={`View booking ${row.bookingReference}`}
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
                <td className="px-3 py-4 text-muted" colSpan={6}>
                  {emptyText}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        limit={pageSize}
        onPageChange={setPage}
      />
    </>
  );
}
