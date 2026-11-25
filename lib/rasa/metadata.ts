import type { Metadata } from "next";

/** Exact handover format: `Programme | RASA, Roots to Rhythm` */
export const SITE_TITLE = "RASA, Roots to Rhythm";

export function rasaTitle(page: string): Metadata {
  return { title: `${page} | ${SITE_TITLE}` };
}