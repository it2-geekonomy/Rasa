import { EventEditScreen } from "@/components/admin/event-edit-screen";

export const instant = false;

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventEditScreen eventId={id} />;
}
