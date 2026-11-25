"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["workshops", "Workshops"],
  ["exhibitions", "Art Exhibitions"],
  ["venue", "Festival Venue"],
  ["stalls", "Stalls"],
  ["faq", "FAQ and policies"],
  ["about", "Why RASA"],
  ["team", "Team"],
  ["sponsors", "Sponsors"],
  ["partners", "Make a difference"],
] as const;

type Props = { open: boolean; onClose: () => void };

export function MoreSheet({ open, onClose }: Props) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-[rgba(36,20,38,.55)] md:hidden"
      role="dialog"
      aria-label="More pages"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full rounded-t-[20px] bg-white px-[18px] pb-[calc(96px+env(safe-area-inset-bottom))] pt-[18px]">
        {LINKS.map(([slug, label]) => {
          const href = `/${slug}`;
          const on = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={slug}
              href={href}
              onClick={onClose}
              className={`flex min-h-12 items-center rounded-[10px] px-3 font-bold text-plum no-underline ${
                on ? "bg-tint2" : ""
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}