import type { Metadata } from "next";
import { ARTISTS, byArtistId } from "@/lib/rasa/catalog";
import { ArtistProfile } from "@/components/rasa/ArtistProfile";
import { rasaTitle } from "@/lib/rasa/metadata";

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return ARTISTS.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const artist = byArtistId(id);
  return rasaTitle(artist?.n ?? "Artist");
}

export default async function ArtistPage({ params }: PageProps) {
  const { id } = await params;
  return <ArtistProfile id={id} />;
}