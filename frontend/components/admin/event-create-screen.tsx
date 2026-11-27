"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/admin/api";
import { useAdmin } from "./admin-gate";
import { EventFormFields, type EventFormState } from "./event-form-fields";
import { BackIcon, Notice, Panel } from "./ui";

export function EventCreateScreen() {
  const { token } = useAdmin();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
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

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api<{ data: { id: string } }>("/events", {
        method: "POST",
        token,
        body: {
          title: form.title,
          category: form.category,
          eventType: form.eventType,
          bookingMode: form.bookingMode,
          isFeatured: form.isFeatured,
          bannerImage: form.bannerImage.trim() || undefined,
          shortDescription: form.shortDescription.trim() || undefined,
          description: form.description.trim() || undefined,
          artistIds: form.artistIds,
        },
      });
      router.replace(`/admin/events/${result.data.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create the event");
      setPending(false);
    }
  }

  return (
    <>
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-plum/80 no-underline hover:text-plum hover:underline"
        >
          <BackIcon />
          Events
        </Link>
        <h1 className="mt-1 font-display text-3xl text-plum">Create event</h1>
      </div>
      {error ? <Notice>{error}</Notice> : null}
      <Panel title="New event">
        <EventFormFields
          form={form}
          setForm={setForm}
          token={token}
          pending={pending}
          submitLabel="Create event"
          cancelHref="/admin/events"
          onSubmit={create}
        />
      </Panel>
    </>
  );
}
