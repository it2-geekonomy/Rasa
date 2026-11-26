import { SessionScreen } from "@/components/admin/session-screen";

export const instant = false;

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionScreen sessionId={id} />;
}
