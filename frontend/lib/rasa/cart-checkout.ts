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

export async function cancelPendingBookings(results: SingleBookingResult[]): Promise<void> {
  const pending = results.filter((r) => r.booking.bookingStatus === "PENDING");
  if (!pending.length) return;
  const email = pending[0].booking.customerEmail;
  await publicApi("/bookings/cancel-pending", {
    method: "POST",
    body: {
      bookingIds: pending.map((r) => r.booking.id),
      email,
    },
  }).catch(() => null);
}

export async function holdAndCreateCartBookings(input: {
  items: CartCheckoutItem[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}): Promise<SingleBookingResult[]> {
  // Release any previous cart holds first so we never conflict with our own
  // held seats or accidentally book a stale seat list from an earlier edit.
  for (const item of input.items) {
    if (item.holdToken) {
      await publicApi(`/sessions/${item.eventSessionId}/holds/release`, {
        method: "POST",
        body: { holdToken: item.holdToken },
      }).catch(() => null);
    }
  }

  // Create fresh holds for the exact seats currently shown in the cart.
  const freshHolds: Array<{ eventSessionId: string; holdToken: string }> = [];
  try {
    for (const item of input.items) {
      const hold = await publicApi<{ holdToken: string }>(
        `/sessions/${item.eventSessionId}/holds`,
        {
          method: "POST",
          body: { eventSeatIds: item.eventSeatIds },
        },
      );
      freshHolds.push({ eventSessionId: item.eventSessionId, holdToken: hold.holdToken });
    }

    const created = await publicApi<{
      bookings: SingleBookingResult["booking"][];
      checkout: SingleBookingResult["checkout"];
    }>("/bookings/cart", {
      method: "POST",
      body: {
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        items: freshHolds,
      },
    });

    return created.bookings.map((booking, index) => ({
      booking,
      checkout: index === 0 ? created.checkout : null,
    }));
  } catch (caught) {
    // Roll back any fresh holds created in this attempt so seats don't stay stuck HELD.
    for (const held of freshHolds) {
      await publicApi(`/sessions/${held.eventSessionId}/holds/release`, {
        method: "POST",
        body: { holdToken: held.holdToken },
      }).catch(() => null);
    }
    throw caught;
  }
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
