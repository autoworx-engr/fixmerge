import crypto from "crypto";

/**
 * HMAC-SHA256 hex digest, same style as GitHub webhooks (`sha256=<hex>`).
 */
export function verifyRiskWebhookSignature(
  payload: string,
  signatureHeader: string
): boolean {
  const secret = process.env.RISK_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  if (expected.length !== signatureHeader.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader)
    );
  } catch {
    return false;
  }
}
