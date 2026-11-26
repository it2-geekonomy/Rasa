
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import {
  fieldClass,
  formatEnum,
  labelClass,
  Notice,
  Panel,
  primaryButtonClass,
  quietButtonClass,
} from "./ui";

const VENUE_TYPES = ["RESERVED_SEATING", "GENERAL_ADMISSION"] as const;

type Venue = {
  id: string;
  name: string;
  venueType: string;
  totalCapacity: number | null;
  isActive: boolean;
  description: string | null;
};

export function VenuesScreen() {
  const { token } = useAdmin();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [createdVenues, setCreatedVenues] = useState<Venue[]>([]);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);

  const rows = [
    ...createdVenues,
    ...venues.filter((venue) => !createdVenues.some((created) => created.id === venue.id)),
  ];

  useEffect(() => {
    api<{ data: Venue[] }>("/venues?limit=20", { token })
      .then((result) => setVenues(result.data))
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load venues"
        )
      );
  }, [token]);

  function closeCreateForm() {
    setCreateOpen(false);
    createButton.current?.focus();
  }

  async function createVenue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setCreateError("Enter a venue name.");
      return;
    }

    const description = String(form.get("description") ?? "").trim();
    const capacity = form.get("totalCapacity");

    setSaving(true);
    setCreateError("");

    try {
      const { data } = await api<{ data: Venue }>("/venues", {
        method: "POST",
        token,
        body: {
          name,
          venueType: form.get("venueType"),
          description: description || undefined,
          totalCapacity: capacity ? Number(capacity) : undefined,
          isActive: form.has("isActive"),
        },
      });
      setCreatedVenues((current) => [data, ...current]);
      closeCreateForm();
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : "Could not create the venue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-plum">Venues</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} venues
          </p>
        </div>
        <button
          ref={createButton}
          type="button"
          className={primaryButtonClass}
          aria-expanded={createOpen}
          aria-controls={createOpen ? "create-venue-form" : undefined}
          aria-disabled={saving}
          onClick={() => {
            if (saving) return;
            setCreateError("");
            setCreateOpen(!createOpen);
          }}
        >
          Create venue
        </button>
      </div>

      <p role="status" className="sr-only">
        {createdVenues[0] ? `${createdVenues[0].name} was created.` : ""}
      </p>

      {createOpen ? (
        <Panel title="Create venue">
          <form id="create-venue-form" onSubmit={createVenue}>
            {createError ? (
              <div role="alert" className="mb-4">
                <Notice>{createError}</Notice>
              </div>
            ) : null}
            <fieldset disabled={saving} className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Name
                <input className={fieldClass} name="name" maxLength={150} required />
              </label>
              <label className={labelClass}>
                Venue type
                <select className={fieldClass} name="venueType" defaultValue="" required>
                  <option value="" disabled>
                    Select a venue type
                  </option>
                  {VENUE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatEnum(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Capacity (optional)
                <input
                  className={fieldClass}
                  name="totalCapacity"
                  type="number"
                  min={1}
                  max={2147483647}
                />
              </label>
              <label className="flex items-center gap-2 self-end py-2 text-sm text-ink">
                <input type="checkbox" name="isActive" className="size-4 accent-plum" defaultChecked />
                Active venue
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Description (optional)
                <textarea className={`${fieldClass} min-h-24`} name="description" />
              </label>
              <div className="flex gap-2 md:col-span-2">
                <button className={primaryButtonClass} type="submit">
                  {saving ? "Saving…" : "Save venue"}
                </button>
                <button className={quietButtonClass} type="button" onClick={closeCreateForm}>
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        </Panel>
      ) : null}

      {error ? <Notice>{error}</Notice> : null}

      <div className="overflow-x-auto rounded-rasa border border-line bg-white">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-tint2 text-plum">
            <tr>
              <th className="px-3 py-2 font-medium">Venue</th>
              <th className="px-3 py-2 font-medium">Venue Type</th>
              <th className="px-3 py-2 font-medium">Capacity</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((venue) => (
              <tr
                key={venue.id}
                className="border-t border-line hover:bg-tint/40"
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium text-plum">
                    {venue.name}
                  </p>
                </td>

                <td className="px-3 py-2.5 capitalize text-muted">
                  {venue.venueType.replace(/_/g, " ")}
                </td>

                <td className="px-3 py-2.5">
                  {venue.totalCapacity
                    ? `${venue.totalCapacity} seats`
                    : "General admission"}
                </td>

                <td className="max-w-xs truncate px-3 py-2.5 text-muted">
                  {venue.description || "—"}
                </td>

                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      venue.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-line bg-tint text-muted"
                    }`}
                  >
                    {venue.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}

            {rows.length === 0 && !error ? (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={5}>
                  No venues found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
