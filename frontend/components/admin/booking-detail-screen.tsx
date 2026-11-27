"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, inr, when } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { Notice, Panel } from "./ui";

type Ticket = {
  id: string;
  ticketNumber: string;
  qrToken: string;
  attendeeName: string;
  status: string;
  bookingSeat: { eventSeat: { seat: { seatLabel: string } } } | null;
};
type Booking = {
  id: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  totalAmount: string;
  bookingStatus: string;
  paymentStatus: string;
  bookedAt: string | null;
  session: { sessionName: string | null; event: { title: string } };
  tickets: Ticket[];
  payments: {
    id: string;
    status: string;
    amount: string;
    currency: string;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    paidAt: string | null;
  }[];
};

export function BookingDetailScreen({ bookingId }: { bookingId: string }) {
  const { token } = useAdmin();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: Booking }>(`/bookings/${bookingId}`, { token })
      .then((result) => setBooking(result.data))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the booking"));
  }, [bookingId, token]);

  if (!booking && !error) return <p className="text-sm text-muted">Loading booking…</p>;

  return (
    <>
      <div>
        <Link href="/admin/bookings" className="text-sm text-plum no-underline">
          Bookings
        </Link>
        <h1 className="font-display text-3xl text-plum">{booking?.bookingReference}</h1>
        <p className="text-sm text-muted">
          {booking?.customerName} · {booking?.customerEmail} · {booking?.customerPhone}
        </p>
        <p className="text-sm text-muted">
          {booking?.session.event.title} · {booking?.bookingStatus} · {inr(booking?.totalAmount)} · {when(booking?.bookedAt)}
        </p>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      {booking ? <PaymentDetails booking={booking} /> : null}
      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">Ticket</th>
              <th className="px-3 py-2 font-medium">Attendee</th>
              <th className="px-3 py-2 font-medium">Seat</th>
              <th className="px-3 py-2 font-medium">QR token</th>
            </tr>
          </thead>
          <tbody>
            {booking?.tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-line">
                <td className="px-3 py-2">
                  {ticket.ticketNumber}
                  <p className="text-xs text-muted">{ticket.status}</p>
                </td>
                <td className="px-3 py-2">{ticket.attendeeName}</td>
                <td className="px-3 py-2">{ticket.bookingSeat?.eventSeat.seat.seatLabel ?? "Open entry"}</td>
                <td className="px-3 py-2 font-mono text-xs break-all">{ticket.qrToken}</td>
              </tr>
            ))}
            {booking && booking.tickets.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={4}>
                  Tickets appear after the booking is confirmed.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PaymentDetails({ booking }: { booking: Booking }) {
  const paid = booking.payments.filter((payment) => payment.status === "CAPTURED");
  const rows = paid.length > 0 ? paid : booking.payments;
  return (
    <Panel title="Payment">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No Razorpay payment. This booking was free.</p>
      ) : (
        <div className="grid gap-3">
          {rows.map((payment) => (
            <div key={payment.id} className="grid gap-1 text-sm">
              <p className="font-medium text-plum">
                {payment.status === "CAPTURED" ? "Paid" : payment.status} · {inr(payment.amount)}
              </p>
              <p className="text-muted">Order {payment.razorpayOrderId || "—"}</p>
              <p className="text-muted">Payment {payment.razorpayPaymentId || "—"}</p>
              <p className="text-muted">{payment.paidAt ? when(payment.paidAt) : "Paid time not recorded"}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
