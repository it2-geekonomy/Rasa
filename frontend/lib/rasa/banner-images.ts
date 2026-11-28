/**
 * Parse Event.bannerImage which may be a single URL string or a JSON array of URLs.
 */
export function parseBannerImages(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim());
      }
    } catch {
      // fall through to single string
    }
  }
  return [trimmed];
}

/**
 * Serialize 0, 1, or multiple banner URLs into the Event.bannerImage text column.
 */
export function serializeBannerImages(urls: string[]): string {
  const clean = urls.map((u) => u.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}
