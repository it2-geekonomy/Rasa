"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { publicApi } from "@/lib/public-api";
import { btnLine, card, lab, wrapTight } from "@/lib/rasa/ui";

type PublicTicket = {
  ticketNumber: string;
  attendeeName: string;
  status: "ACTIVE" | "USED" | "CANCELLED";
  bookingReference: string;
  bookingStatus: string;
  showTitle: string;
  sessionName: string | null;
  venueName: string;
  startAt: string;
  endAt: string;
  seatLabel: string | null;
};

const when = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export default function PublicTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    publicApi<PublicTicket>(`/tickets/public/${encodeURIComponent(token)}`)
      .then((data) => {
        if (!cancel) setTicket(data);
      })
      .catch((caught) => {
        if (!cancel) {
          setError(caught instanceof Error ? caught.message : "Ticket not found");
        }
      });
    return () => {
      cancel = true;
    };
  }, [token]);

  const badge =
    ticket?.status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
      : ticket?.status === "USED"
        ? "bg-amber-100 text-amber-900 border-amber-300"
        : "bg-red-100 text-red-900 border-red-300";

  const statusText =
    ticket?.status === "ACTIVE"
      ? "Valid · Ready for entry"
      : ticket?.status === "USED"
        ? "Already checked in"
        : "Cancelled";

  return (
    <main className={`${wrapTight} py-10`}>
      <div className={`${card} mx-auto max-w-lg`}>
        <p className={`${lab} text-burg`}>RASA Festival · Ticket</p>
        {error ? (
          <div className="mt-4">
            <h1 className="font-display text-2xl text-plum">Ticket not found</h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
          </div>
        ) : !ticket ? (
          <p className="mt-4 text-sm text-muted">Loading ticket details…</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-lab text-sm font-bold tracking-wider text-plum">
                {ticket.ticketNumber}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${badge}`}>
                {statusText}
              </span>
            </div>

            <div>
              <h1 className="font-display text-2xl leading-snug text-plum">
                {ticket.showTitle}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {ticket.venueName} · {when.format(new Date(ticket.startAt))}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-tint/70 p-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Guest</dt>
                <dd className="mt-0.5 font-semibold text-plum">{ticket.attendeeName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {ticket.seatLabel ? "Seat" : "Entry"}
                </dt>
                <dd className="mt-0.5 font-semibold text-plum">
                  {ticket.seatLabel ? `Seat ${ticket.seatLabel}` : "Workshop / Slot"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Booking Ref</dt>
                <dd className="mt-0.5 font-medium text-ink">{ticket.bookingReference}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Status</dt>
                <dd className="mt-0.5 font-medium text-ink">{ticket.status}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-6">
          <Link href="/events/fri" className={`${btnLine} inline-flex min-h-11 items-center text-sm no-underline`}>
            Back to RASA Festival
          </Link>
        </div>
      </div>
    </main>
  );
}
