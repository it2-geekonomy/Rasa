import { API_BASE } from "@/lib/admin/api";

export async function publicApi<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = (await response.json().catch(() => null)) as {
    message?: string | string[];
    data?: T;
  } | null;
  if (!response.ok) {
    const message = json?.message;
    throw new Error(Array.isArray(message) ? message.join(", ") : message || "Request failed");
  }
  return (json?.data ?? json) as T;
}
