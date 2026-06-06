/**
 * Display helpers. The SDK returns raw counts (so callers can sort/compare);
 * use these when you want a compact human-readable label.
 */

/**
 * Compact number formatting for display: `91000` → `"91K"`, `9550` → `"9.6K"`,
 * `1200000` → `"1.2M"`. Accepts a number or numeric string. Returns `undefined`
 * for nullish/empty input, and the original string if it isn't numeric.
 *
 * @example
 * formatCompact(channel.subscriberCount) // "91K"
 */
export function formatCompact(
  value: number | string | null | undefined,
): string | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return typeof value === "string" ? value : undefined;
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
