"use client";

import Link from "next/link";
import { ArtistPicker } from "./artist-picker";
import { ImageUploadField } from "./image-upload";
import { fieldClass, labelClass, primaryButtonClass, quietButtonClass } from "./ui";

export const EVENT_CATEGORIES = ["Performance", "Workshop", "Wellness", "Art", "Food"] as const;
export const EVENT_TYPES = ["PERFORMANCE", "WORKSHOP", "EXHIBITION", "WELLNESS", "OTHER"] as const;
export const BOOKING_MODES = ["SEAT_BASED", "CAPACITY_BASED", "FREE_ENTRY"] as const;
export const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"] as const;

export type EventFormState = {
  title: string;
  category: string;
  eventType: string;
  bookingMode: string;
  status: string;
  isFeatured: boolean;
  bannerImage: string;
  shortDescription: string;
  description: string;
  artistIds: string[];
};

export function EventFormFields({
  form,
  setForm,
  token,
  showStatus = false,
  pending,
  disabled,
  submitLabel,
  savingLabel = "Saving…",
  cancelHref,
  onSubmit,
}: {
  form: EventFormState;
  setForm: React.Dispatch<React.SetStateAction<EventFormState>>;
  token: string;
  showStatus?: boolean;
  pending: boolean;
  disabled?: boolean;
  submitLabel: string;
  savingLabel?: string;
  cancelHref: string;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <label className={labelClass}>
        Title
        <input
          className={fieldClass}
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          required
        />
      </label>
      <label className={labelClass}>
        Category
        <select
          className={fieldClass}
          value={form.category}
          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
        >
          {EVENT_CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Type
        <select
          className={fieldClass}
          value={form.eventType}
          onChange={(event) => setForm((prev) => ({ ...prev, eventType: event.target.value }))}
        >
          {EVENT_TYPES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Booking
        <select
          className={fieldClass}
          value={form.bookingMode}
          onChange={(event) => setForm((prev) => ({ ...prev, bookingMode: event.target.value }))}
        >
          {BOOKING_MODES.map((item) => (
            <option key={item} value={item}>
              {item === "SEAT_BASED" ? "Auditorium seats" : item === "CAPACITY_BASED" ? "Slots" : "Free entry"}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-muted">
          Auditorium events use seat blocks. The Amphitheatre, Banquet Hall, and Rehearsal Studio use a slot count.
        </span>
      </label>
      {showStatus ? (
        <label className={labelClass}>
          Status
          <select
            className={fieldClass}
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
          >
            {EVENT_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex items-center gap-2 self-end py-2 text-sm text-ink">
        <input
          type="checkbox"
          className="size-4 accent-plum"
          checked={form.isFeatured}
          onChange={(event) => setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
        />
        Featured event
      </label>
      <div className="md:col-span-2">
        <ImageUploadField
          label="Banner image"
          value={form.bannerImage}
          onChange={(bannerImage) => setForm((prev) => ({ ...prev, bannerImage }))}
          token={token}
          folder="events"
        />
      </div>
      <label className={`${labelClass} md:col-span-2`}>
        Short description
        <input
          className={fieldClass}
          value={form.shortDescription}
          onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
        />
      </label>
      <label className={`${labelClass} md:col-span-2`}>
        Description
        <textarea
          className={`${fieldClass} min-h-28`}
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
      </label>
      <div className="md:col-span-2">
        <ArtistPicker
          token={token}
          selectedIds={form.artistIds}
          onChange={(artistIds) => setForm((prev) => ({ ...prev, artistIds }))}
        />
      </div>
      <div className="flex gap-2 md:col-span-2">
        <button className={primaryButtonClass} type="submit" disabled={pending || disabled}>
          {pending ? savingLabel : submitLabel}
        </button>
        <Link href={cancelHref} className={`${quietButtonClass} no-underline`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
