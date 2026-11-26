"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  clearAdminSession,
  readAdminSession,
  type AdminSession,
} from "@/lib/admin/session";

const AdminContext = createContext<AdminSession & { logout: () => void } | null>(null);

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) {
    throw new Error("Admin session is missing");
  }
  return value;
}

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/events", "Events"],
  ["/admin/venues", "Venues"],
  ["/admin/bookings", "Bookings"],
  ["/admin/payments", "Payments"],
  ["/admin/checkin", "Check-in"],
] as const;

export function AdminGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);
  const login = pathname === "/admin/login";

  useEffect(() => {
    setSession(readAdminSession());
    setReady(true);
  }, [pathname]);

  useEffect(() => {
    if (ready && !login && !session) {
      router.replace("/admin/login");
    }
  }, [ready, login, session, router]);

  if (login) return children;
  if (!ready || !session) {
    return <p className="p-6 text-sm text-muted">Checking the admin session…</p>;
  }

  function logout() {
    clearAdminSession();
    setSession(null);
    router.replace("/admin/login");
  }

  return (
    <AdminContext.Provider value={{ ...session, logout }}>
      <div className="min-h-dvh bg-tint text-ink">
        <header className="border-b border-line bg-plum-d text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-lab text-xs tracking-[0.16em] uppercase">RASA staff</p>
              <p className="font-display text-lg">{session.user.name}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/" className="text-white/80 no-underline hover:text-white">
                Public site
              </Link>
              <button type="button" onClick={logout} className="text-white">
                Log out
              </button>
            </div>
          </div>
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-3">
            {LINKS.map(([href, label]) => {
              const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`shrink-0 rounded-rasa px-3 py-1.5 text-sm no-underline ${
                    active ? "bg-white text-plum" : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5">{children}</div>
      </div>
    </AdminContext.Provider>
  );
}
