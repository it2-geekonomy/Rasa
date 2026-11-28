"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "framer-motion";
import { RasaImage } from "./RasaImage";
import { MAIN_LINKS, SUB_NAV, groupForPath, subSlug } from "@/lib/rasa/nav";

export function SiteHeader() {
  const logoRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    const el = logoRef.current;
    if (!el || reduced) return;
    gsap.fromTo(
      el,
      { opacity: 0, x: -6, scale: 0.96 },
      { opacity: 1, x: 0, scale: 1, duration: 0.45, ease: "power2.out", delay: 0.08 },
    );
  }, [reduced]);
  const group = groupForPath(pathname);
  const headerGroup = group === "artists" ? "festival" : group;
  const sub = subSlug(pathname);
  const subs = SUB_NAV[headerGroup];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex min-h-14 max-w-[1240px] items-center gap-3 px-4 max-md:min-h-[3.25rem] md:min-h-16 md:gap-5 md:px-6">
        <Link href="/" className="flex shrink-0 items-center text-plum no-underline" aria-label="RASA home">
          <span ref={logoRef} className="inline-block">
            <RasaImage
              img="logo-color"
              alt="RASA, Roots to Rhythm"
              width={900}
              height={450}
              className="!h-8 !w-auto md:!h-[52px]"
              priority
            />
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-0.5 md:flex" aria-label="Main">
          {MAIN_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 items-center rounded-full px-3 py-2.5 font-medium text-ink no-underline ${
                item.group === headerGroup ? "bg-tint2 font-bold text-plum" : "hover:bg-tint"
              } ${item.group === "booking" ? "max-md:!hidden" : ""}`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/booking" className={`${btnBook} ml-2 hidden md:inline-flex`}>
            Book tickets
          </Link>
        </nav>
        <Link href="/booking" className={`${btnBook} ml-auto shrink-0 md:!hidden`}>
          Tickets
        </Link>
      </div>
      {subs ? (
        <div className="border-t border-line bg-tint">
          <div className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto px-6 max-md:px-2 [&::-webkit-scrollbar]:hidden">
            {subs.map(([slug, label]) => {
              const href = slug === "events" ? "/events" : `/${slug}`;
              const on = sub === slug || (slug === "events" && pathname.startsWith("/events"));
              return (
                <Link
                  key={slug}
                  href={href}
                  className={`flex min-h-[46px] items-center whitespace-nowrap border-b-[3px] px-4 py-3 font-medium no-underline ${
                    on
                      ? "border-burg font-bold text-plum"
                      : "border-transparent text-muted"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}

const btnBook =
  "inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-burg px-3.5 py-1.5 text-[0.8rem] font-bold text-white no-underline hover:bg-burg-d md:min-h-[46px] md:px-6 md:py-3 md:text-[0.95rem]";