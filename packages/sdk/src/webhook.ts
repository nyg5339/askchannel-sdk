/**
 * Verify the `X-AskChannel-Signature` header on an import webhook callback.
 *
 * AskChannel signs the raw request body with HMAC-SHA256 using your webhook
 * secret and sends it as `sha256=<hex>`. Verify it before trusting the payload.
 * Uses Web Crypto (`globalThis.crypto.subtle`), so it works in Node 18+, edge
 * runtimes, and browsers — no dependencies.
 *
 * @example
 * ```ts
 * const raw = await req.text();
 * const ok = await verifyWebhookSignature(raw, req.headers.get("x-askchannel-signature"), SECRET);
 * if (!ok) return new Response("bad signature", { status: 401 });
 * const event = JSON.parse(raw) as ImportWebhookEvent;
 * ```
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqual(expected, provided);
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string compare to avoid leaking the signature via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
