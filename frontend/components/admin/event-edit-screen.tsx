"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { EventFormFields, type EventFormState } from "./event-form-fields";
import { BackIcon, Notice, Panel } from "./ui";

type EventDetail = {
  id: string;
  title: string;
  category: string;
  eventType: string;
  bookingMode: string;
  status: string;
  isFeatured: boolean;
  bannerImage: string | null;
  shortDescription: string | null;
  description: string | null;
  artists?: { artist: { id: string } }[];
};

export function EventEditScreen({ eventId }: { eventId: string }) {
  const { token } = useAdmin();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<EventFormState>({
    title: "",
    category: "Performance",
    eventType: "PERFORMANCE",
    bookingMode: "SEAT_BASED",
    status: "DRAFT",
    isFeatured: false,
    bannerImage: "",
    shortDescription: "",
    description: "",
    artistIds: [],
  });

  useEffect(() => {
    api<{ data: EventDetail }>(`/events/${eventId}`, { token })
      .then((result) => {
        const event = result.data;
        setForm({
          title: event.title,
          category: event.category,
          eventType: event.eventType,
          bookingMode: event.bookingMode,
          status: event.status,
          isFeatured: Boolean(event.isFeatured),
          bannerImage: event.bannerImage ?? "",
          shortDescription: event.shortDescription ?? "",
          description: event.description ?? "",
          artistIds: (event.artists ?? []).map((item) => item.artist.id),
        });
        setReady(true);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the event"));
  }, [eventId, token]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api(`/events/${eventId}`, {
        method: "PATCH",
        token,
        body: {
          title: form.title,
          category: form.category,
          eventType: form.eventType,
          bookingMode: form.bookingMode,
          status: form.status,
          isFeatured: form.isFeatured,
          bannerImage: form.bannerImage.trim(),
          shortDescription: form.shortDescription,
          description: form.description,
          artistIds: form.artistIds,
        },
      });
      router.replace(`/admin/events/${eventId}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update the event");
      setPending(false);
    }
  }

  if (!ready && !error) return <p className="text-sm text-muted">Loading event…</p>;

  return (
    <>
      <div>
        <Link
          href={`/admin/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-plum/80 no-underline hover:text-plum hover:underline"
        >
          <BackIcon />
          Event
        </Link>
        <h1 className="mt-1 font-display text-3xl text-plum">Update event</h1>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <Panel title={form.title || "Event"}>
        <EventFormFields
          form={form}
          setForm={setForm}
          token={token}
          showStatus
          pending={pending}
          disabled={!ready}
          submitLabel="Update event"
          cancelHref={`/admin/events/${eventId}`}
          onSubmit={save}
        />
      </Panel>
    </>
  );
}
