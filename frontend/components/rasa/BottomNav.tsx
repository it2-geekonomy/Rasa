"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { groupForPath } from "@/lib/rasa/nav";

type Props = { onMore: () => void; moreOpen: boolean };

export function BottomNav({ onMore, moreOpen }: Props) {
  const pathname = usePathname();
  const group = groupForPath(pathname);
  const bmap: Record<string, string> = {
    home: "home",
    festival: "festival",
    artists: "artists",
    booking: "booking",
  };

  const items = [
    { g: "home", href: "/", label: "Home", icon: homeIcon },
    { g: "festival", href: "/events", label: "Schedule", icon: calIcon },
    { g: "artists", href: "/artists", label: "Artists", icon: artistsIcon },
    { g: "booking", href: "/booking", label: "Tickets", icon: ticketIcon },
  ];

  return (
    <nav
      className="bnav fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-2.5 right-2.5 z-40 hidden max-md:flex min-h-[50px] items-stretch justify-between gap-0.5 rounded-full border border-white/15 bg-plum-d/95 p-0.5 shadow-[0_6px_20px_rgba(36,20,38,.42)] backdrop-blur-md"
      aria-label="Quick"
    >
      {items.map((item) => {
        const on = bmap[group] === item.g;
        return (
          <Link
            key={item.g}
            href={item.href}
            className={`flex min-h-10 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-0.5 text-[0.62rem] font-semibold leading-tight no-underline ${
              on ? "bg-white text-plum" : "text-[#d9bfe0]"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        className={`flex min-h-10 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-0.5 text-[0.62rem] font-semibold leading-tight text-[#d9bfe0] ${
          moreOpen ? "bg-white text-plum" : ""
        }`}
        aria-haspopup="dialog"
        onClick={onMore}
      >
        {moreIcon}
        More
      </button>
    </nav>
  );
}

const svgCls = "size-[20px] fill-none stroke-current stroke-2";

const homeIcon = (
  <svg viewBox="0 0 24 24" className={svgCls}>
    <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
);
const calIcon = (
  <svg viewBox="0 0 24 24" className={svgCls}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
const artistsIcon = (
  <svg viewBox="0 0 24 24" className={svgCls}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20c0-4 3-6 7-6s7 2 7 6M17 5a3.5 3.5 0 0 1 0 7M22 20c0-3-1.5-5-4-5.6" />
  </svg>
);
const ticketIcon = (
  <svg viewBox="0 0 24 24" className={svgCls}>
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
    <path d="M14 6v12" strokeDasharray="2 2" />
  </svg>
);
const moreIcon = (
  <svg viewBox="0 0 24 24" className={svgCls}>
    <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);