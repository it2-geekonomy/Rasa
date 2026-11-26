"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type PageMeta } from "@/lib/admin/api";
import { fieldClass } from "./ui";

export type ArtistOption = {
  id: string;
  name: string;
  designation: string | null;
  profileImage: string | null;
};

export function ArtistPicker({
  token,
  selectedIds,
  onChange,
}: {
  token: string;
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
}) {
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    api<{ data: ArtistOption[]; meta: PageMeta }>("/artists?limit=100&isActive=true", { token })
      .then((res) => {
        if (!cancel) setArtists(res.data);
      })
      .catch((caught) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load artists");
      });
    return () => {
      cancel = true;
    };
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.designation ?? "").toLowerCase().includes(q),
    );
  }, [artists, query]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedObjects = useMemo(
    () =>
      selectedIds
        .map((id) => artists.find((a) => a.id === id))
        .filter((a): a is ArtistOption => Boolean(a)),
    [selectedIds, artists],
  );

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="grid gap-2 text-sm text-muted">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>Artists ({selectedIds.length} selected)</span>
        <input
          className={`${fieldClass} max-w-xs`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search artists…"
        />
      </div>

      {selectedObjects.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedObjects.map((artist) => (
            <button
              key={artist.id}
              type="button"
              onClick={() => toggle(artist.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-plum/25 bg-tint2 px-2.5 py-1 text-xs font-medium text-plum hover:bg-tint"
              title="Click to remove"
            >
              {artist.name}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-xs text-burg">{error}</p> : null}

      <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-rasa border border-line bg-tint/30 p-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((artist) => {
          const checked = selectedSet.has(artist.id);
          return (
            <button
              key={artist.id}
              type="button"
              onClick={() => toggle(artist.id)}
              aria-pressed={checked}
              className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition ${
                checked ? "border-plum bg-white shadow-xs" : "border-line/70 bg-white/80 hover:border-plum/40"
              }`}
            >
              <div className="size-9 shrink-0 overflow-hidden rounded-full border border-line bg-tint">
                {artist.profileImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={artist.profileImage} alt={artist.name} className="size-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-plum">{artist.name}</p>
                {artist.designation ? (
                  <p className="truncate text-[11px] text-muted">{artist.designation}</p>
                ) : null}
              </div>
              <span
                className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] font-bold ${
                  checked ? "border-plum bg-plum text-white" : "border-line bg-white text-transparent"
                }`}
              >
                ✓
              </span>
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <p className="col-span-full py-4 text-center text-xs text-muted">No matching artists found.</p>
        ) : null}
      </div>
    </div>
  );
}
