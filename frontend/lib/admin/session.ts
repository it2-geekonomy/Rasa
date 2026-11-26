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

export function readAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed.token || !parsed.user?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAdminSession(session: AdminSession) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  window.localStorage.removeItem(KEY);
}
