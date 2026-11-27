import { createHmac, timingSafeEqual } from 'crypto';

export function checkoutSignature(orderId: string, paymentId: string, secret: string) {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

export function webhookSignature(rawBody: Buffer, secret: string) {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function signaturesMatch(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
