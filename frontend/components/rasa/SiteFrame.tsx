"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function SiteFrame({ children }: { children: ReactNode }) {
  const admin = usePathname().startsWith("/admin");
  if (admin) return children;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="min-w-0 flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
