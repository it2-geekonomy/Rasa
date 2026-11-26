"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, when } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { BackIcon, EyeIcon, formatEnum, Notice, Panel, primaryButtonClass, statusBadgeClass } from "./ui";

type ArtistDetail = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  biography: string | null;
  profileImage: string | null;
  socialLinks: Record<string, string | undefined> | null;
  isActive: boolean;
  updatedAt: string;
  photos: { id: string; imageUrl: string }[];
  events: {
    id: string;
    event: {
      id: string;
      title: string;
      category: string;
      status: string;
      bookingMode: string;
    };
  }[];
};

export function ArtistDetailScreen({ artistId }: { artistId: string }) {
  const { token } = useAdmin();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: ArtistDetail }>(`/artists/${artistId}`, { token })
      .then((result) => setArtist(result.data))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the artist"));
  }, [artistId, token]);

  if (!artist && !error) return <p className="text-sm text-muted">Loading artist…</p>;

  if (!artist) {
    return (
      <div className="grid gap-4">
        <div>
          <Link href="/admin/artists" className="inline-flex items-center gap-1.5 text-sm font-medium text-plum no-underline hover:underline">
            <BackIcon />
            Back to artists
          </Link>
        </div>
        <Notice>{error || "Artist not found."}</Notice>
      </div>
    );
  }

  const links = artist.socialLinks ?? {};

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {artist.profileImage ? (
            <div className="size-20 shrink-0 overflow-hidden rounded-rasa border border-line bg-tint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artist.profileImage} alt={artist.name} className="size-full object-cover" />
            </div>
          ) : null}
          <div className="min-w-0">
            <Link
              href="/admin/artists"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-plum/80 no-underline hover:text-plum hover:underline"
            >
              <BackIcon />
              Artists
            </Link>
            <h1 className="mt-1 font-display text-3xl text-plum">{artist.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  artist.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-line bg-tint text-muted"
                }`}
              >
                {artist.isActive ? "Active" : "Inactive"}
              </span>
              {artist.designation ? (
                <span className="text-sm text-muted">{artist.designation}</span>
              ) : null}
            </div>
          </div>
        </div>
        <Link href={`/admin/artists/${artist.id}/edit`} className={`${primaryButtonClass} shrink-0 no-underline`}>
          Update
        </Link>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Panel title="Biography">
          {artist.biography ? (
            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted">{artist.biography}</p>
          ) : (
            <p className="text-sm text-muted">No biography added yet.</p>
          )}
        </Panel>

        <Panel title="Profile details">
          <dl className="divide-y divide-line text-sm">
            <div className="flex items-center justify-between gap-3 pb-2.5">
              <dt className="text-muted">Slug</dt>
              <dd>
                <code className="rounded bg-tint px-1.5 py-0.5 text-xs text-plum">{artist.slug}</code>
              </dd>
            </div>
            {links.ig ? (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">Instagram</dt>
                <dd className="font-medium text-plum">@{links.ig}</dd>
              </div>
            ) : null}
            {links.web ? (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">Website</dt>
                <dd className="truncate font-medium text-ink">{links.web}</dd>
              </div>
            ) : null}
            {links.em ? (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">Email</dt>
                <dd className="truncate font-medium text-ink">{links.em}</dd>
              </div>
            ) : null}
            {links.ph ? (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">Phone</dt>
                <dd className="font-medium text-ink">{links.ph}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 pt-2.5">
              <dt className="text-muted">Updated</dt>
              <dd className="text-xs text-muted">{when(artist.updatedAt)}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel title="Linked events">
        {artist.events.length > 0 ? (
          <div className="overflow-x-auto rounded-rasa border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-tint2 text-plum">
                <tr>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Mode</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {artist.events.map((entry) => (
                  <tr key={entry.id} className="border-t border-line hover:bg-tint/40">
                    <td className="px-3 py-2.5 font-medium text-plum">{entry.event.title}</td>
                    <td className="px-3 py-2.5">{entry.event.category}</td>
                    <td className="px-3 py-2.5">{formatEnum(entry.event.bookingMode)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(entry.event.status)}`}>
                        {formatEnum(entry.event.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/events/${entry.event.id}`}
                        aria-label={`View ${entry.event.title}`}
                        title="View event"
                        className="inline-flex size-8 items-center justify-center rounded-rasa text-plum hover:bg-tint"
                      >
                        <EyeIcon />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Not linked to any events yet.</p>
        )}
      </Panel>

      <Panel title="Photo gallery">
        {artist.photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {artist.photos.map((photo, index) => (
              <div key={photo.id} className="overflow-hidden rounded-rasa border border-line bg-tint">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.imageUrl} alt={`${artist.name} photo ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No gallery photos uploaded yet.</p>
        )}
      </Panel>
    </>
  );
}
