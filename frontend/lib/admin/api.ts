export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined" ? "/api" : "http://127.0.0.1:6060/api");

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const GET_CACHE_TTL_MS = 30_000;
const inflightGets = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, { data: unknown; expiresAt: number }>();

export function clearAdminApiCache() {
  responseCache.clear();
  inflightGets.clear();
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null; fresh?: boolean } = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isGet = method === "GET" && options.body === undefined;
  const cacheKey = `${options.token ?? ""}:${path}`;

  if (!isGet) {
    clearAdminApiCache();
  } else if (!options.fresh) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    const pending = inflightGets.get(cacheKey);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  const request = (async () => {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    if (!response.ok) {
      const message = Array.isArray(payload?.message)
        ? payload.message.join(" ")
        : payload?.message || "Request failed";
      throw new ApiError(message, response.status);
    }
    if (isGet) {
      responseCache.set(cacheKey, { data: payload, expiresAt: Date.now() + GET_CACHE_TTL_MS });
    }
    return payload as T;
  })();

  if (isGet && !options.fresh) {
    inflightGets.set(cacheKey, request);
    request.finally(() => {
      if (inflightGets.get(cacheKey) === request) {
        inflightGets.delete(cacheKey);
      }
    });
  }

  return request;
}

export async function uploadImage(
  file: File,
  token: string,
  folder: "events" | "artists" | "general" = "general",
): Promise<{ key: string; url: string; contentType: string; size: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/uploads/image?folder=${folder}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as {
    data?: { key: string; url: string; contentType: string; size: number };
    message?: string | string[];
  } | null;
  if (!response.ok || !payload?.data) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(" ")
      : payload?.message || "Could not upload image";
    throw new ApiError(message, response.status);
  }
  return payload.data;
}

export function inr(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return String(value ?? "");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function when(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
