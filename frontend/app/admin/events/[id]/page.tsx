import { EventDetailScreen } from "@/components/admin/event-detail-screen";

export const instant = false;

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailScreen eventId={id} />;
}
