import { ArtistDetailScreen } from "@/components/admin/artist-detail-screen";

export const instant = false;

export default async function ArtistDetailAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArtistDetailScreen artistId={id} />;
}
