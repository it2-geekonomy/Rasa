import { SessionCreateScreen } from "@/components/admin/session-create-screen";

export const instant = false;

export default async function NewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionCreateScreen eventId={id} />;
}
