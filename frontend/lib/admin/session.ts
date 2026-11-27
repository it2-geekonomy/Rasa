export type AdminUser = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
};

export type AdminSession = {
  token: string;
  user: AdminUser;
};

const KEY = "rasa.admin";
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedSession: AdminSession | null = null;

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeAdminSession(listener: () => void) {
  listeners.add(listener);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) {
      cachedRaw = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getServerAdminSession(): AdminSession | null {
  return null;
}

export function readAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  if (!raw) {
    cachedSession = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AdminSession;
    cachedSession = parsed.token && parsed.user?.email ? parsed : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

export function writeAdminSession(session: AdminSession) {
  const raw = JSON.stringify(session);
  window.localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedSession = session;
  notify();
}

export function clearAdminSession() {
  window.localStorage.removeItem(KEY);
  cachedRaw = null;
  cachedSession = null;
  notify();
}
