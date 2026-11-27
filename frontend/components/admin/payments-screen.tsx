"use client";

import { useEffect, useState } from "react";
import { api, inr, when } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { Notice } from "./ui";

type Payment = {
  id: string;
  bookingId: string;
  amount: string;
  status: string;
  razorpayOrderId: string | null;
  createdAt: string;
};

export function PaymentsScreen() {
  const { token } = useAdmin();
  const [rows, setRows] = useState<Payment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: Payment[] }>("/payments?limit=50", { token })
      .then((result) => setRows(result.data))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load payments"));
  }, [token]);

  return (
    <>
      <h1 className="font-display text-3xl text-plum">Payments</h1>
      {error ? <Notice>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2">{when(row.createdAt)}</td>
                <td className="px-3 py-2">{inr(row.amount)}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.razorpayOrderId || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={4}>
                  No payments yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
