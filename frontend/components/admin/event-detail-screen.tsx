"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, inr, when } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { parseBannerImages } from "@/lib/rasa/banner-images";
import {
  BackIcon,
  EyeIcon,
  formatEnum,
  Notice,
  Panel,
  primaryButtonClass,
  quietButtonClass,
  statusBadgeClass,
} from "./ui";

type SessionRow = {
  id: string;
  sessionName: string | null;
  startAt: string;
  endAt?: string;
  capacity?: number | null;
  price: string;
  status: string;
  venue: { id?: string; name: string; venueType?: string };
};

type EventArtistRow = {
  id: string;
  role?: string | null;
  artist: {
    id: string;
    name: string;
    slug: string;
    designation: string | null;
    profileImage: string | null;
  };
};

type EventDetail = {
  id: string;
  title: string;
  slug?: string;
  status: string;
  bookingMode: string;
  eventType: string;
  category: string;
  isFeatured?: boolean;
  bannerImage?: string | null;
  shortDescription: string | null;
  description: string | null;
  updatedAt?: string;
  admin?: { id: string; name: string; email: string } | null;
  artists?: EventArtistRow[];
  sessions: SessionRow[];
};

export function EventDetailScreen({ eventId }: { eventId: string }) {
  const { token } = useAdmin();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: EventDetail }>(`/events/${eventId}`, { token })
      .then((result) => setEvent(result.data))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the event"));
  }, [eventId, token]);

  if (!event && !error) {
    return <p className="text-sm text-muted">Loading event…</p>;
  }

  if (!event) {
    return (
      <div className="grid gap-4">
        <div>
          <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-plum no-underline hover:underline">
            <BackIcon />
            Back to events
          </Link>
        </div>
        <Notice>{error || "Event not found."}</Notice>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-plum/80 no-underline hover:text-plum hover:underline"
          >
            <BackIcon />
            Events
          </Link>
          <h1 className="mt-1 font-display text-3xl text-plum">{event.title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(event.status)}`}>
              {formatEnum(event.status)}
            </span>
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-ink">
              {event.category}
            </span>
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-muted">
              {formatEnum(event.eventType)}
            </span>
            <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-muted">
              {formatEnum(event.bookingMode)}
            </span>
            {event.isFeatured ? (
              <span className="inline-flex items-center rounded-full border border-plum/25 bg-tint2 px-2.5 py-0.5 text-xs font-medium text-plum">
                Featured
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href={`/admin/events/${event.id}/edit`} className={`${quietButtonClass} inline-flex items-center no-underline`}>
            Update
          </Link>
          <Link href={`/admin/events/${event.id}/sessions/new`} className={`${primaryButtonClass} inline-flex items-center no-underline`}>
            Add session
          </Link>
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Panel title="About this event">
          {parseBannerImages(event.bannerImage).length > 0 ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {parseBannerImages(event.bannerImage).map((url, idx) => (
                <div key={`${url}-${idx}`} className="overflow-hidden rounded-rasa border border-line bg-tint">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${event.title}${idx > 0 ? ` (${idx + 1})` : ""}`}
                    className="max-h-64 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
          {event.shortDescription || event.description ? (
            <div className="grid gap-4">
              {event.shortDescription ? (
                <div>
                  <p className="font-lab text-xs font-semibold tracking-wider text-muted uppercase">Summary</p>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink">{event.shortDescription}</p>
                </div>
              ) : null}
              {event.description ? (
                <div className={event.shortDescription ? "border-t border-line pt-4" : undefined}>
                  <p className="font-lab text-xs font-semibold tracking-wider text-muted uppercase">Details</p>
                  <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted">{event.description}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">No description added yet.</p>
          )}
        </Panel>

        <Panel title="Event settings">
          <dl className="divide-y divide-line text-sm">
            <div className="flex items-center justify-between gap-3 pb-2.5">
              <dt className="text-muted">Status</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(event.status)}`}>
                  {formatEnum(event.status)}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-muted">Category</dt>
              <dd className="font-medium text-ink">{event.category}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-muted">Event type</dt>
              <dd className="font-medium text-ink">{formatEnum(event.eventType)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-muted">Booking mode</dt>
              <dd className="font-medium text-ink">{formatEnum(event.bookingMode)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-muted">Sessions</dt>
              <dd className="font-medium text-plum">{event.sessions.length}</dd>
            </div>
            {event.slug ? (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="shrink-0 text-muted">Slug</dt>
                <dd className="min-w-0 truncate">
                  <code className="rounded bg-tint px-1.5 py-0.5 text-xs text-plum">{event.slug}</code>
                </dd>
              </div>
            ) : null}
            {event.admin ? (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">Created by</dt>
                <dd className="font-medium text-ink">{event.admin.name}</dd>
              </div>
            ) : null}
            {event.updatedAt ? (
              <div className="flex items-center justify-between gap-3 pt-2.5">
                <dt className="text-muted">Updated</dt>
                <dd className="text-xs text-muted">{when(event.updatedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </Panel>
      </div>

      <Panel title="Artists">
        <p className="-mt-2 mb-4 text-sm text-muted">
          {(event.artists ?? []).length} performing {(event.artists ?? []).length === 1 ? "artist" : "artists"} linked to this event.
        </p>
        {event.artists && event.artists.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {event.artists.map((entry) => (
              <Link
                key={entry.id}
                href={`/admin/artists/${entry.artist.id}`}
                className="flex items-center gap-3 rounded-rasa border border-line bg-tint/30 p-3 no-underline transition hover:border-plum hover:bg-white"
              >
                <div className="size-12 shrink-0 overflow-hidden rounded-full border border-line bg-tint">
                  {entry.artist.profileImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={entry.artist.profileImage} alt={entry.artist.name} className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-plum">{entry.artist.name}</p>
                  {entry.artist.designation ? (
                    <p className="truncate text-xs text-muted">{entry.artist.designation}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            No artists linked yet.{" "}
            <Link href={`/admin/events/${event.id}/edit`} className="font-medium text-plum underline">
              Update event
            </Link>{" "}
            to assign artists.
          </p>
        )}
      </Panel>

      <Panel title="Sessions">
        <p className="-mt-2 mb-4 text-sm text-muted">
          {event.sessions.length} scheduled {event.sessions.length === 1 ? "session" : "sessions"}. Open a session to manage seats, capacity, or pricing.
        </p>
        <div className="overflow-x-auto rounded-rasa border border-line">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-tint2 text-plum">
              <tr>
                <th className="px-3 py-2 font-medium">Session</th>
                <th className="px-3 py-2 font-medium">Venue</th>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {event.sessions.length ? (
                event.sessions.map((session) => (
                  <tr key={session.id} className="border-t border-line hover:bg-tint/40">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/sessions/${session.id}`} className="font-medium text-plum no-underline hover:underline">
                        {session.sessionName || "Session"}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-ink">{session.venue.name}</p>
                      {session.venue.venueType ? (
                        <p className="text-xs text-muted">{formatEnum(session.venue.venueType)}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-ink">{when(session.startAt)}</p>
                      {session.endAt ? <p className="text-xs text-muted">until {when(session.endAt)}</p> : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-ink">{inr(session.price)}</p>
                      <p className="text-xs text-muted">
                        {session.capacity != null
                          ? `${session.capacity} slots`
                          : event.bookingMode === "SEAT_BASED"
                            ? "Seat map"
                            : "Open entry"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(session.status)}`}>
                        {formatEnum(session.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/sessions/${session.id}`}
                        aria-label={`View ${session.sessionName || "session"}`}
                        title="View session"
                        className="inline-flex size-8 items-center justify-center rounded-rasa text-plum hover:bg-tint"
                      >
                        <EyeIcon />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-muted" colSpan={6}>
                    No sessions yet.{" "}
                    <Link href={`/admin/events/${event.id}/sessions/new`} className="font-medium text-plum underline">
                      Add a session
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
