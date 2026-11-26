import type { ReactNode } from "react";

export const fieldClass =
  "w-full rounded-rasa border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-plum";

export const labelClass = "grid gap-1 text-sm text-muted";

export const primaryButtonClass =
  "rounded-rasa bg-plum px-4 py-2 text-sm font-medium text-white hover:bg-plum-d disabled:cursor-wait disabled:opacity-60";

export const quietButtonClass =
  "rounded-rasa border border-line bg-white px-4 py-2 text-sm text-plum hover:bg-tint";

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
