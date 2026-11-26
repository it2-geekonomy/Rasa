"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type PageMeta } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { Notice } from "./ui";

const CARDS = [
  ["/admin/events", "Events", "Create a show or workshop, then add a session."],
  ["/admin/venues", "Venues", "The four festival venues are already seeded."],
  ["/admin/bookings", "Bookings", "See who has reserved or paid."],
  ["/admin/checkin", "Check-in", "Look up a QR token and mark the ticket used."],
] as const;

export function OverviewScreen() {
  const { token } = useAdmin();
  const [counts, setCounts] = useState({ events: 0, sessions: 0, bookings: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const [events, sessions, bookings] = await Promise.all([
          api<{ meta: PageMeta }>("/events?limit=1", { token }),
          api<{ meta: PageMeta }>("/sessions?limit=1", { token }),
          api<{ meta: PageMeta }>("/bookings?limit=1", { token }),
        ]);
        if (!cancel) {
          setCounts({
            events: events.meta.total,
            sessions: sessions.meta.total,
            bookings: bookings.meta.total,
          });
        }
      } catch (caught) {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load the overview");
      }
    }
    void load();
    return () => {
      cancel = true;
    };
  }, [token]);

  return (
    <>
      <div>
        <h1 className="font-display text-3xl text-plum">Festival desk</h1>
        <p className="mt-1 text-sm text-muted">
          {counts.events} events, {counts.sessions} sessions, {counts.bookings} bookings.
        </p>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map(([href, title, text]) => (
          <Link key={href} href={href} className="rounded-rasa border border-line bg-white p-4 no-underline hover:border-plum">
            <h2 className="font-display text-2xl text-plum">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
