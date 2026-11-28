"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type PageMeta } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { EyeIcon, fieldClass, Notice, primaryButtonClass, quietButtonClass } from "./ui";

type ArtistRow = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  profileImage: string | null;
  isActive: boolean;
  _count: { events: number; photos: number };
};

const PAGE_SIZE = 10;

export function ArtistsScreen() {
  const { token } = useAdmin();
  const [rows, setRows] = useState<ArtistRow[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    const query = new URLSearchParams({
      limit: String(PAGE_SIZE),
      page: String(page),
    });
    if (search.trim()) query.set("search", search.trim());
    if (activeFilter) query.set("isActive", activeFilter);
    const load = () => {
      api<{ data: ArtistRow[]; meta: PageMeta }>(`/artists?${query}`, { token })
        .then((result) => {
          if (!cancel) {
            setRows(result.data);
            setMeta(result.meta);
          }
        })
        .catch((caught) => {
          if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load artists");
        });
    };
    if (!search.trim()) {
      load();
      return () => {
        cancel = true;
      };
    }
    const handle = window.setTimeout(load, 200);
    return () => {
      cancel = true;
      window.clearTimeout(handle);
    };
  }, [token, page, search, activeFilter]);

  const totalPages = Math.max(meta?.totalPages ?? 1, 1);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-plum">Artists</h1>
          <p className="mt-1 text-sm text-muted">{meta ? `${meta.total} artists` : "Loading artists…"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${fieldClass} !w-full sm:!w-56 shrink-0`}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or role…"
          />
          <select
            className={`${fieldClass} !w-auto shrink-0`}
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <Link href="/admin/artists/new" className={`${primaryButtonClass} shrink-0 no-underline`}>
            Create artist
          </Link>
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">Artist</th>
              <th className="px-3 py-2 font-medium">Designation</th>
              <th className="px-3 py-2 font-medium">Events</th>
              <th className="px-3 py-2 font-medium">Photos</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line hover:bg-tint/40">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="size-10 shrink-0 overflow-hidden rounded-full border border-line bg-tint">
                      {row.profileImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={row.profileImage} alt={row.name} className="size-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-plum">{row.name}</p>
                      <p className="text-xs text-muted">{row.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="max-w-xs px-3 py-2.5 text-muted">{row.designation || "—"}</td>
                <td className="px-3 py-2.5">{row._count.events}</td>
                <td className="px-3 py-2.5">{row._count.photos}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      row.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-line bg-tint text-muted"
                    }`}
                  >
                    {row.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/admin/artists/${row.id}`}
                    aria-label={`View ${row.name}`}
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
                  No artists found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`${quietButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className={`${quietButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
