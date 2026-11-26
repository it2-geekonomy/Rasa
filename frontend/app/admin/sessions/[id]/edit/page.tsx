import { SessionEditScreen } from "@/components/admin/session-edit-screen";

export const instant = false;

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionEditScreen sessionId={id} />;
}
