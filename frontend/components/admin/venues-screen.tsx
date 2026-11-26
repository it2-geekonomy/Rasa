"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { Notice } from "./ui";

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
  const [rows, setRows] = useState<Venue[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: Venue[] }>("/venues?limit=20", { token })
      .then((result) => setRows(result.data))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load venues"));
  }, [token]);

  return (
    <>
      <div>
        <h1 className="font-display text-3xl text-plum">Venues</h1>
        <p className="mt-1 text-sm text-muted">These four rooms are already in the database. Seat maps for the other three can be added when they arrive.</p>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((venue) => (
          <article key={venue.id} className="rounded-rasa border border-line bg-white p-4">
            <h2 className="font-display text-2xl text-plum">{venue.name}</h2>
            <p className="text-sm text-muted">{venue.venueType.replace(/_/g, " ")}</p>
            <p className="mt-2 text-sm">{venue.totalCapacity ? `${venue.totalCapacity} seats` : "General admission"}</p>
          </article>
        ))}
      </div>
    </>
  );
}
