/**
 * Minimal HTML-escape for Telegram `parse_mode: "HTML"`. Escapes only the three
 * characters Telegram's HTML parser treats as markup, so a channel title or a
 * user's question can't break the message. Exported because every render helper
 * here uses it and bot authors usually need it for their own surrounding copy.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
