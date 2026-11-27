import { BookingDetailScreen } from "@/components/admin/booking-detail-screen";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookingDetailScreen bookingId={id} />;
}
