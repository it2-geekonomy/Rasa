"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { fieldClass, labelClass, Notice, Panel, primaryButtonClass, quietButtonClass } from "./ui";

type TicketView = {
  ticketNumber: string;
  attendeeName: string;
  status: string;
  eventSessionId: string;
  session: { sessionName: string | null; event: { title: string } };
  bookingSeat: { eventSeat: { seat: { seatLabel: string } } } | null;
};

export function CheckinScreen() {
  const { token } = useAdmin();
  const [qrToken, setQrToken] = useState("");
  const [preview, setPreview] = useState<{ valid: boolean; reason: string | null; ticket: TicketView } | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setDone("");
    setPreview(null);
    try {
      const result = await api<{ data: { valid: boolean; reason: string | null; ticket: TicketView } }>(
        "/tickets/validate",
        { method: "POST", token, body: { qrToken: qrToken.trim() } },
      );
      setPreview(result.data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Ticket not found");
    }
  }

  async function checkIn() {
    setError("");
    setDone("");
    try {
      const result = await api<{ data: { ticket: { ticketNumber: string; status: string } } }>("/checkins", {
        method: "POST",
        token,
        body: { qrToken: qrToken.trim() },
      });
      setDone(`${result.data.ticket.ticketNumber} is ${result.data.ticket.status}.`);
      setPreview(null);
      setQrToken("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Check-in failed");
    }
  }

  return (
    <>
      <div>
        <h1 className="font-display text-3xl text-plum">Check-in</h1>
        <p className="mt-1 text-sm text-muted">Paste the token from the QR code. Looking it up does not use the ticket.</p>
      </div>
      <Panel title="QR token">
        <form onSubmit={lookup} className="grid gap-3">
          <label className={labelClass}>
            Token
            <textarea className={`${fieldClass} min-h-24 font-mono`} value={qrToken} onChange={(event) => setQrToken(event.target.value)} required />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={quietButtonClass} type="submit">
              Look up
            </button>
            <button className={primaryButtonClass} type="button" onClick={checkIn} disabled={!qrToken.trim()}>
              Check in
            </button>
          </div>
        </form>
      </Panel>
      {error ? <Notice>{error}</Notice> : null}
      {done ? <p className="text-sm text-plum">{done}</p> : null}
      {preview ? (
        <article className="rounded-rasa border border-line bg-white p-4">
          <p className="font-display text-2xl text-plum">{preview.ticket.attendeeName}</p>
          <p className="text-sm">
            {preview.ticket.ticketNumber} · {preview.ticket.session.event.title} · {preview.ticket.status}
          </p>
          <p className="text-sm text-muted">{preview.ticket.bookingSeat?.eventSeat.seat.seatLabel ?? "Open entry"}</p>
          <p className="mt-2 text-sm">{preview.valid ? "Ready to enter." : preview.reason}</p>
        </article>
      ) : null}
    </>
  );
}
