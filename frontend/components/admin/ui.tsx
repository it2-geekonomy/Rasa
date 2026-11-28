import type { ReactNode } from "react";

export const fieldClass =
  "w-full rounded-rasa border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-plum";

export const labelClass = "grid gap-1 text-sm text-muted";

export const primaryButtonClass =
  "rounded-rasa bg-plum px-4 py-2 text-sm font-medium text-white hover:bg-plum-d disabled:cursor-wait disabled:opacity-60";

export const quietButtonClass =
  "rounded-rasa border border-line bg-white px-4 py-2 text-sm text-plum hover:bg-tint";

const ENUM_LABELS: Record<string, string> = {
  PERFORMANCE: "Performance",
  WORKSHOP: "Workshop",
  EXHIBITION: "Exhibition",
  WELLNESS: "Wellness",
  OTHER: "Other",
  SEAT_BASED: "Auditorium seats",
  CAPACITY_BASED: "Slots",
  FREE_ENTRY: "Free entry",
  RESERVED_SEATING: "Reserved seating",
  GENERAL_ADMISSION: "General admission",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  SCHEDULED: "Scheduled",
  OPEN: "Open",
  SOLD_OUT: "Sold out",
};

export function formatEnum(value?: string | null) {
  if (!value) return "—";
  return ENUM_LABELS[value] ?? value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function statusBadgeClass(status: string) {
  if (status === "PUBLISHED" || status === "OPEN" || status === "CONFIRMED" || status === "CAPTURED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "PENDING" || status === "HELD") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (status === "CANCELLED" || status === "SOLD_OUT" || status === "FAILED" || status === "EXPIRED") {
    return "border-[#f1c4cb] bg-[#fbe7ea] text-burg";
  }
  if (status === "SCHEDULED" || status === "COMPLETED" || status === "REFUNDED") {
    return "border-line bg-tint2 text-plum";
  }
  return "border-line bg-tint text-muted";
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-rasa bg-tint px-3 py-2 text-sm text-burg">{children}</p>;
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-rasa border border-line bg-white p-4 md:p-5">
      <h2 className="font-display text-xl text-plum">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (nextPage: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-rasa border border-line bg-white px-4 py-3 text-sm">
      <p className="text-muted">
        {total === 0 ? "Showing 0 results" : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`${quietButtonClass} !px-3 !py-1.5 disabled:cursor-not-allowed disabled:opacity-50`}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="px-2 text-muted">
          Page {page} of {safeTotalPages}
        </span>
        <button
          type="button"
          className={`${quietButtonClass} !px-3 !py-1.5 disabled:cursor-not-allowed disabled:opacity-50`}
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
