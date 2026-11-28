import { publicApi } from "@/lib/public-api";
import type { PassBooking } from "@/components/rasa/booking/TicketPasses";

export type CartCheckoutItem = {
  eventSessionId: string;
  eventSeatIds: string[];
  holdToken?: string;
  holdExpiresAt?: string;
};

export type SingleBookingResult = {
  booking: {
    id: string;
    bookingReference: string;
    bookingStatus: string;
    totalAmount: string | number;
    customerEmail: string;
  };
  checkout: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
  } | null;
};

type RazorpayHandler = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function holdAndCreateCartBookings(input: {
  items: CartCheckoutItem[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}): Promise<SingleBookingResult[]> {
  const results: SingleBookingResult[] = [];
  for (const item of input.items) {
    const expiryMs = item.holdExpiresAt ? Date.parse(item.holdExpiresAt) : 0;
    const hasActiveHold = Boolean(item.holdToken && expiryMs > Date.now() + 5000);
    let holdToken = item.holdToken;
    if (!hasActiveHold) {
      const hold = await publicApi<{ holdToken: string }>(`/sessions/${item.eventSessionId}/holds`, {
        method: "POST",
        body: { eventSeatIds: item.eventSeatIds },
      });
      holdToken = hold.holdToken;
    }
    const created = await publicApi<SingleBookingResult>("/bookings", {
      method: "POST",
      body: {
        eventSessionId: item.eventSessionId,
        holdToken,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
      },
    });
    results.push(created);
  }
  return results;
}

export async function loadCartPasses(
  bookings: Array<{ id: string; customerEmail: string }>,
): Promise<PassBooking[]> {
  const results = await Promise.all(
    bookings.map((b) =>
      publicApi<PassBooking>(
        `/bookings/${b.id}/status?email=${encodeURIComponent(b.customerEmail)}`,
      ),
    ),
  );
  return results.filter((p) => p.bookingStatus === "CONFIRMED");
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as Window & { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

export async function payBookingsSequentially(
  results: SingleBookingResult[],
): Promise<void> {
  const payable = results.filter((r) => Boolean(r.checkout));
  if (!payable.length) return;
  await loadRazorpayScript();

  const Razorpay = (
    window as Window & {
      Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    }
  ).Razorpay;
  if (!Razorpay) throw new Error("Could not load Razorpay checkout");

  for (const item of payable) {
    const checkout = item.checkout!;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const client = new Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        order_id: checkout.orderId,
        name: "RASA Festival",
        description: item.booking.bookingReference,
        modal: {
          ondismiss: () => {
            if (!settled) {
              settled = true;
              reject(new Error(`Payment cancelled for ${item.booking.bookingReference}`));
            }
          },
        },
        handler: async (response: RazorpayHandler) => {
          try {
            await publicApi("/payments/verify", {
              method: "POST",
              body: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            settled = true;
            resolve();
          } catch (caught) {
            settled = true;
            reject(
              caught instanceof Error ? caught : new Error("Payment could not be confirmed"),
            );
          }
        },
      });
      client.open();
    });
  }
}
