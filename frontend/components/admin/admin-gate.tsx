"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { clearAdminApiCache } from "@/lib/admin/api";
import {
  clearAdminSession,
  getServerAdminSession,
  readAdminSession,
  subscribeAdminSession,
  type AdminSession,
} from "@/lib/admin/session";

const AdminContext = createContext<(AdminSession & { logout: () => void }) | null>(null);

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) {
    throw new Error("Admin session is missing");
  }
  return value;
}

const LINKS = [
  { href: "/admin", label: "Overview", icon: GridIcon },
  { href: "/admin/events", label: "Events", icon: TicketIcon },
  { href: "/admin/sessions", label: "Sessions", icon: ClockIcon },
  { href: "/admin/artists", label: "Artists", icon: UsersIcon },
  { href: "/admin/venues", label: "Venues", icon: PinIcon },
  { href: "/admin/bookings", label: "Bookings", icon: BookIcon },
  { href: "/admin/payments", label: "Payments", icon: CardIcon },
  { href: "/admin/checkin", label: "Check-in", icon: ScanIcon },
] as const;

export function AdminGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAdminSession,
    readAdminSession,
    getServerAdminSession,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const login = pathname === "/admin/login";

  useEffect(() => {
    if (!login && !readAdminSession()) {
      router.replace("/admin/login");
    }
  }, [login, session, router]);

  const logout = useCallback(() => {
    clearAdminApiCache();
    clearAdminSession();
    router.replace("/admin/login");
  }, [router]);

  const contextValue = useMemo(
    () => (session ? { ...session, logout } : null),
    [session, logout],
  );

  if (login) return children;
  if (!session || !contextValue) {
    return <p className="min-h-dvh bg-tint p-6 text-sm text-muted">Checking the admin session…</p>;
  }

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="min-h-dvh bg-tint text-ink">
        <Sidebar session={session} pathname={pathname} onLogout={logout} className="hidden lg:flex" />
        {menuOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}
        <Sidebar
          session={session}
          pathname={pathname}
          onLogout={logout}
          onNavigate={() => setMenuOpen(false)}
          inert={!menuOpen}
          className={`z-40 transition-transform lg:hidden ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        />
        <div className="min-h-dvh lg:pl-64">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              className="rounded-rasa border border-line px-3 py-1.5 text-sm font-medium text-plum"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              Menu
            </button>
            <p className="font-display text-lg text-plum">RASA staff</p>
          </header>
          <div className="grid gap-4 px-4 py-5 lg:px-8 lg:py-7">{children}</div>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

function Sidebar({
  session,
  pathname,
  onLogout,
  onNavigate,
  className,
  inert,
}: {
  session: AdminSession;
  pathname: string;
  onLogout: () => void;
  onNavigate?: () => void;
  className: string;
  inert?: boolean;
}) {
  return (
    <aside inert={inert} className={`fixed inset-y-0 left-0 flex w-64 flex-col bg-plum-d text-white ${className}`}>
      <div className="border-b border-white/10 px-5 py-5">
        <p className="font-lab text-xs tracking-[0.18em] text-white/70 uppercase">Festival desk</p>
        <p className="font-display text-2xl leading-none">RASA</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        {LINKS.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-rasa px-3 py-2.5 text-sm no-underline ${
                active ? "bg-white font-medium text-plum" : "text-white/85 hover:bg-white/10"
              }`}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-sm font-medium">{session.user.name}</p>
        <p className="truncate text-xs text-white/65">{session.user.email}</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <Link href="/" className="text-white/80 no-underline hover:text-white">
            Public site
          </Link>
          <button type="button" onClick={onLogout} className="text-white/80 hover:text-white">
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v2a2 2 0 0 1 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 5h11a2 2 0 0 1 2 2v12H8a2 2 0 0 0-2 2V5Z" />
      <path d="M6 19a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M7 4H5a1 1 0 0 0-1 1v2M17 4h2a1 1 0 0 1 1 1v2M7 20H5a1 1 0 0 1-1-1v-2M17 20h2a1 1 0 0 0 1-1v-2M8 12h8" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 20c0-2.6-1.4-4.2-3.8-4.8" />
    </svg>
  );
}
