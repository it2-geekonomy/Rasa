"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { duration, easeOut } from "@/lib/rasa/motion";
import { RasaImage } from "./RasaImage";
import { MAIN_LINKS, SUB_NAV, groupForPath, subSlug } from "@/lib/rasa/nav";

export function SiteHeader() {
  const logoRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const menuOpen = openForPath === pathname;

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
    <header className="sticky top-0 z-50 border-b border-line bg-white shadow-[0_1px_12px_rgba(36,20,38,0.04)]">
      <div className="relative z-50 mx-auto flex min-h-14 max-w-[1240px] items-center gap-3 bg-white px-4 max-md:min-h-[3.25rem] md:min-h-16 md:gap-5 md:px-6">
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
        <nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {MAIN_LINKS.map((item) => {
            const active = item.group === headerGroup;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2 text-[0.9rem] no-underline transition-colors xl:px-3.5 xl:py-2.5 xl:text-[0.97rem] ${
                  active ? "font-bold text-plum" : "font-medium text-ink hover:text-plum"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="main-nav-pill"
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-full bg-tint2/90 ring-1 ring-plum/10"
                  />
                ) : null}
                {item.label}
              </Link>
            );
          })}
          <Link href="/booking" className={`${btnBook} ml-2 hidden lg:inline-flex`}>
            Book tickets
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <Link href="/booking" className={btnBook}>
            Tickets
          </Link>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-white text-plum hover:bg-tint"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setOpenForPath((p) => (p === pathname ? null : pathname))}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {menuOpen ? (
          <motion.nav
            key="mobile-nav"
            initial={reduced ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: duration.fast, ease: easeOut }}
            className="fixed inset-0 z-40 flex flex-col justify-between overflow-y-auto bg-white px-5 pt-20 pb-8 lg:hidden"
            aria-label="Mobile menu"
          >
            <div className="grid gap-1.5">
              {MAIN_LINKS.map((item, idx) => {
                const active = item.group === headerGroup;
                return (
                  <motion.div
                    key={item.href}
                    initial={reduced ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: duration.fast, ease: easeOut, delay: reduced ? 0 : idx * 0.03 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpenForPath(null)}
                      className={`flex min-h-12 items-center justify-between rounded-2xl px-4 py-3 text-[1.08rem] no-underline transition-colors ${
                        active
                          ? "bg-tint2 font-bold text-plum ring-1 ring-plum/10"
                          : "font-medium text-ink hover:bg-tint"
                      }`}
                    >
                      <span>{item.label}</span>
                      {active ? <span className="size-2 rounded-full bg-burg" aria-hidden /> : null}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <Link
                href="/booking"
                onClick={() => setOpenForPath(null)}
                className="flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-burg to-[#7c1422] px-6 py-3 text-base font-bold text-white no-underline shadow-sm shadow-burg/25"
              >
                Book tickets
              </Link>
              <p className="mt-3 text-center text-xs text-muted">
                8–10 Jan 2027 · Prestige Centre for Performing Arts, Bengaluru
              </p>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
      {subs ? (
        <div className="border-t border-line/70 bg-gradient-to-b from-tint/85 to-white/70">
          {/* Desktop: spring-animated editorial tab bar */}
          <div className="mx-auto hidden max-w-[1240px] gap-1 px-6 md:flex" role="navigation" aria-label="Section">
            {subs.map(([slug, label]) => {
              const href = slug === "events" ? "/events" : `/${slug}`;
              const on = sub === slug || (slug === "events" && pathname.startsWith("/events"));
              return (
                <Link
                  key={slug}
                  href={href}
                  className={`relative flex min-h-[46px] items-center gap-2 whitespace-nowrap px-4 py-3 text-[0.92rem] no-underline transition-colors ${
                    on ? "font-bold text-plum" : "font-medium text-muted hover:text-plum"
                  }`}
                >
                  <SubNavIcon slug={slug} className={`size-4 ${on ? "text-burg" : "text-muted/75"}`} />
                  <span>{label}</span>
                  {on ? (
                    <motion.span
                      layoutId="desktop-sub-indicator"
                      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 440, damping: 34 }}
                      className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gradient-to-r from-burg to-plum"
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Mobile: slim single-row icon+label architectural tab strip (all items visible, no scroll) */}
          <div className="px-2 py-1.5 md:hidden" role="navigation" aria-label="Section">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${subs.length}, minmax(0, 1fr))` }}
            >
              {subs.map(([slug, label]) => {
                const href = slug === "events" ? "/events" : `/${slug}`;
                const on = sub === slug || (slug === "events" && pathname.startsWith("/events"));
                const shortLabel = slug === "exhibitions" ? "Exhibits" : label;
                return (
                  <Link
                    key={slug}
                    href={href}
                    className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center no-underline transition-colors ${
                      on ? "text-plum" : "text-muted hover:text-ink"
                    }`}
                  >
                    {on ? (
                      <motion.span
                        layoutId="mobile-sub-active"
                        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-xl bg-white shadow-[0_1px_6px_rgba(91,31,93,0.12)] ring-1 ring-plum/12"
                      />
                    ) : null}
                    <span
                      className={`relative z-10 flex size-6 items-center justify-center rounded-lg transition-colors ${
                        on ? "bg-tint2/80 text-burg" : "text-muted/80"
                      }`}
                    >
                      <SubNavIcon slug={slug} className="size-3.5" />
                    </span>
                    <span
                      className={`relative z-10 w-full truncate text-[0.65rem] leading-none tracking-tight ${
                        on ? "font-bold text-plum" : "font-medium"
                      }`}
                    >
                      {shortLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function SubNavIcon({ slug, className }: { slug: string; className?: string }) {
  switch (slug) {
    case "events":
      return (
        <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="14" height="13" rx="2.5" />
          <path d="M7 2.5v3M13 2.5v3M3 8.5h14" />
        </svg>
      );
    case "workshops":
      return (
        <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 2.5l1.9 4.3 4.6.5-3.4 3.1.9 4.6L10 12.7 6 15l.9-4.6-3.4-3.1 4.6-.5L10 2.5z" />
        </svg>
      );
    case "artists":
      return (
        <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="10" cy="6.5" r="3" />
          <path d="M4.5 16.5c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
        </svg>
      );
    case "exhibitions":
      return (
        <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3.5" width="14" height="13" rx="2" />
          <circle cx="7.5" cy="8" r="1.3" />
          <path d="M4.5 14l3.5-3.5 2.5 2.5 2.2-2.2 2.8 3.2" />
        </svg>
      );
    case "stalls":
      return (
        <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4.5 7.5h11l-1 9H5.5l-1-9z" />
          <path d="M7.5 7.5V6a2.5 2.5 0 015 0v1.5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="10" cy="10" r="6.5" />
          <path d="M10 7v3.5l2.5 1.5" />
        </svg>
      );
  }
}

const btnBook =
  "inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-burg to-[#7c1422] px-3.5 py-1.5 text-[0.8rem] font-bold text-white no-underline shadow-sm shadow-burg/25 transition-all hover:shadow-md hover:shadow-burg/30 lg:min-h-[44px] lg:px-6 lg:py-2.5 lg:text-[0.95rem]";