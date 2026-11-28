import { API_BASE } from "@/lib/admin/api";
import { publicApi } from "@/lib/public-api";
import type { ArtistContact } from "./types";

export type ArtistSocialLinks = ArtistContact & {
  category?: string;
  credit?: string;
};

export type PublicArtistPhoto = {
  id: string;
  imageUrl: string;
};

export type PublicArtistEventSession = {
  id: string;
  sessionName: string | null;
  startAt: string;
  endAt: string;
  price: string | number;
  status: string;
  venue: { id: string; name: string } | null;
};

export type PublicArtistEventLink = {
  role: string | null;
  sortOrder: number;
  event: {
    id: string;
    title: string;
    slug: string;
    shortDescription?: string | null;
    category?: string | null;
    eventType?: string | null;
    bookingMode?: string | null;
    sessions?: PublicArtistEventSession[];
  };
};

export type PublicArtist = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  biography: string | null;
  profileImage: string | null;
  socialLinks: ArtistSocialLinks | null;
  isActive: boolean;
  photos: PublicArtistPhoto[];
  events?: PublicArtistEventLink[];
};

const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

export function resolveArtistImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("/uploads/")) return `${API_ORIGIN}${trimmed}`;
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
}

const CACHE_TTL_MS = 30_000;
let cachedList: { data: PublicArtist[]; expiresAt: number } | null = null;
let inflightList: Promise<PublicArtist[]> | null = null;
const cachedBySlug = new Map<string, { data: PublicArtist; expiresAt: number }>();
const inflightBySlug = new Map<string, Promise<PublicArtist>>();

export async function fetchPublicArtists(): Promise<PublicArtist[]> {
  if (cachedList && cachedList.expiresAt > Date.now()) {
    return cachedList.data;
  }
  if (inflightList) return inflightList;

  inflightList = publicApi<PublicArtist[] | { data: PublicArtist[] }>("/artists/public?limit=100")
    .then((res) => {
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      cachedList = { data, expiresAt: Date.now() + CACHE_TTL_MS };
      return data;
    })
    .finally(() => {
      inflightList = null;
    });

  return inflightList;
}

export async function fetchPublicArtistBySlug(slug: string): Promise<PublicArtist> {
  const key = slug.trim();
  const cached = cachedBySlug.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const inflight = inflightBySlug.get(key);
  if (inflight) return inflight;

  const promise = publicApi<PublicArtist>(`/artists/slug/${encodeURIComponent(key)}`)
    .then((data) => {
      cachedBySlug.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    })
    .finally(() => {
      inflightBySlug.delete(key);
    });

  inflightBySlug.set(key, promise);
  return promise;
}
