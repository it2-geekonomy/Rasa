import { ArtistFormScreen } from "@/components/admin/artist-form-screen";

export const instant = false;

export default async function EditArtistAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArtistFormScreen artistId={id} />;
}
