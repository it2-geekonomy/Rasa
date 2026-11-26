"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { sheetBackdrop, sheetPanel } from "@/lib/rasa/motion";

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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="more-sheet"
          className="fixed inset-0 z-50 flex items-end bg-[rgba(36,20,38,.55)] md:hidden"
          role="dialog"
          aria-label="More pages"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={sheetBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="w-full rounded-t-[20px] bg-white px-[18px] pb-[calc(96px+env(safe-area-inset-bottom))] pt-[18px]"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sheetPanel}
          >
            {LINKS.map(([slug, label], i) => {
              const href = `/${slug}`;
              const on = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <motion.div
                  key={slug}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 + i * 0.03, duration: 0.32 }}
                >
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`flex min-h-12 items-center rounded-[10px] px-3 font-bold text-plum no-underline ${
                      on ? "bg-tint2" : ""
                    }`}
                  >
                    {label}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}