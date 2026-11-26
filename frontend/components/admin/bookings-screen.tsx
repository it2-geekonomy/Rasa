"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, inr, when } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { fieldClass, Notice } from "./ui";

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

export function BookingsScreen() {
  const { token } = useAdmin();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams({ limit: "50" });
    if (search.trim()) query.set("search", search.trim());
    const handle = window.setTimeout(() => {
      api<{ data: BookingRow[] }>(`/bookings?${query}`, { token })
        .then((result) => setRows(result.data))
        .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load bookings"));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search, token]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl text-plum">Bookings</h1>
        <input className={`${fieldClass} max-w-xs`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, or reference" />
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">Reference</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Show</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <Link href={`/admin/bookings/${row.id}`} className="font-medium text-plum no-underline">
                    {row.bookingReference}
                  </Link>
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
                <td className="px-3 py-2">
                  {row.bookingStatus}
                  <p className="text-xs text-muted">{row.paymentStatus}</p>
                </td>
                <td className="px-3 py-2">
                  {inr(row.totalAmount)}
                  <p className="text-xs text-muted">{row.quantity}</p>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={5}>
                  No bookings yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
