"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { formatDocumentTitle, pageTitleLabel } from "@/lib/rasa/metadata";

/** Mirrors handover `document.title = …` on every route change (reliable in mobile browsers). */
export function RasaDocumentTitle() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = formatDocumentTitle(pageTitleLabel(pathname));
  }, [pathname]);

  return null;
}