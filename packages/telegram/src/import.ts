/**
 * Channel-import command parsing + message rendering for the
 * `/askchannel-import` flow (search YouTube → confirm cost → import → live
 * progress → done).
 *
 * All pure: parsing + HTML-string builders only. The host owns the SDK client
 * calls (`searchYouTubeChannels`, `quoteImport`, `importChannel`,
 * `getImportProgress`) and all Telegram I/O. Because the import command is
 * hyphenated it can't be a real slash-command — it works as an inline-query
 * prefix, discovered via a button that prefills `@yourbot /askchannel-import `.
 */
import {
  formatCompact,
  isAskChannelError,
  type Channel,
  type ImportProgress,
  type ImportQuote,
  type ImportResult,
} from "@askchannelai/sdk";
import { escapeHtml } from "./html.js";
import type { InlineKeyboardMarkup, InlineQueryResultArticle } from "./types.js";

/** Inline-query prefix that opens the import picker. */
export const IMPORT_INLINE_PREFIX = "/askchannel-import";

/** Callback_data shapes: `aci:go:<UCid>` (import) / `aci:x:<UCid>` (cancel). */
export const IMPORT_CALLBACK_RE = /^aci:(go|x):(UC[A-Za-z0-9_-]+)$/;

/** Gate the import dropdown behind the `/askchannel-import` prefix. Returns the
 *  trimmed search term, or null to suppress the dropdown. */
export function parseInlineImportQuery(query: string): string | null {
  const m = query
    .trim()
    .match(/^\/askchannel-import(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  if (!m) return null;
  return (m[1] ?? "").trim();
}

/** The message Telegram sends when a channel is picked. Carries the channel id
 *  in a real youtube.com link so the bot can recover it (and it's useful). */
function importPickPromptMessage(c: Channel): string {
  const link = `https://www.youtube.com/channel/${encodeURIComponent(c.id)}`;
  return (
    `<b>${escapeHtml(c.title)}</b> (<a href="${link}">View on YouTube</a>)\n` +
    `⏳ Estimating import costs…`
  );
}

/** Build the inline dropdown of importable YouTube channels. */
export function buildImportInlineResults(
  channels: Channel[],
): InlineQueryResultArticle[] {
  return channels.map((c) => {
    const subs = formatCompact(c.subscriberCount);
    const description =
      [c.handle, subs ? `${subs} subs` : ""].filter(Boolean).join(" · ") ||
      undefined;
    return {
      type: "article" as const,
      id: c.id.slice(0, 64),
      title: c.title,
      description,
      ...(c.thumbnail ? { thumbnail_url: c.thumbnail } : {}),
      input_message_content: {
        message_text: importPickPromptMessage(c),
        parse_mode: "HTML" as const,
        link_preview_options: { is_disabled: true },
      },
    };
  });
}

/** Recover the channel id from an import-prompt message (one of YOUR `via_bot`
 *  picks). Returns null for any other message. */
export function importChannelIdFromMessage(
  msg: {
    via_bot?: { username?: string };
    entities?: { type: string; url?: string }[];
  },
  botUsername: string,
): string | null {
  const self = botUsername.toLowerCase().replace(/^@+/, "");
  if (msg.via_bot?.username?.toLowerCase() !== self) return null;
  for (const e of msg.entities ?? []) {
    if (e.type === "text_link" && typeof e.url === "string") {
      const m = e.url.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)/i);
      if (m && m[1]) return m[1];
    }
  }
  return null;
}

/** Best-effort display label (`@handle`, else title) parsed from a confirm
 *  message, so error copy never falls back to a raw channel id. */
export function importLabelFromMessage(msg: { text?: string }): string | undefined {
  const text = msg.text ?? "";
  const handle = text.match(/\(@([\w.\-]+)\)/);
  if (handle && handle[1]) return "@" + handle[1];
  const title = text.match(/📥\s+([^\n(]+?)(?:\s*\(@|\n|$)/);
  return title && title[1] ? title[1].trim() : undefined;
}

/** Display label from a quote: prefer the `@handle`, then the title. Never a raw id. */
export function quoteLabel(q: ImportQuote): string {
  return q.handle || q.title || "this channel";
}

/** The confirm message + buttons for a quote. The credit figure is an estimate
 *  from the channel's total video count (`ceil(videos / 10)`, Shorts included =
 *  upper bound); the exact Shorts-excluded count is billed at import time. */
export function importConfirmMessage(q: ImportQuote): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  const handlePart = q.handle ? ` (${escapeHtml(q.handle)})` : "";
  const bal = q.balance === null ? "unlimited" : String(q.balance);
  if (!q.hasEnough) {
    const need = q.creditCost - (q.balance ?? 0);
    return {
      text:
        `📥 Import <b>${escapeHtml(q.title)}</b>${handlePart}?\n\n` +
        `<b>${q.importable.toLocaleString()}</b> videos · ~<b>${q.creditCost}</b> credits (estimate) — ` +
        `you have ${bal}.\n⚠️ Need ${need} more credits to import.`,
      reply_markup: {
        inline_keyboard: [
          [{ text: "✖ Cancel", callback_data: `aci:x:${q.channelId}` }],
        ],
      },
    };
  }
  return {
    text:
      `📥 Import <b>${escapeHtml(q.title)}</b>${handlePart}?\n\n` +
      `<b>${q.importable.toLocaleString()}</b> videos · ~<b>${q.creditCost}</b> credits (estimate; you have ${bal}).`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Import", callback_data: `aci:go:${q.channelId}` },
          { text: "✖ Cancel", callback_data: `aci:x:${q.channelId}` },
        ],
      ],
    },
  };
}

/** Map a triggered-import result to the message to show. */
export function importStartedMessage(title: string, res: ImportResult): string {
  const name = `<b>${escapeHtml(title)}</b>`;
  if (res.alreadyImported) {
    return `✅ ${name} is already imported — try <code>/askchannel</code>.`;
  }
  if (res.queued) {
    return `⏳ ${name} is queued behind another import — it'll start automatically. I'll update here.`;
  }
  return `⏳ Importing ${name}… this can take a few minutes. I'll update here when it's done.`;
}

/** Friendly message for an import trigger / quote error. */
export function importErrorMessage(e: unknown, title: string): string {
  const name = `<b>${escapeHtml(title)}</b>`;
  if (isAskChannelError(e)) {
    switch (e.code) {
      case "payment_required":
        return `⚠️ Not enough credits to import ${name}.`;
      case "import_in_progress":
        return `⏳ ${name} is already being imported — hang tight.`;
      case "not_found":
        return `Couldn't find ${name} on YouTube.`;
      case "unauthorized":
        return "The AskChannel token is invalid or not premium.";
    }
  }
  return `⚠️ Couldn't start importing ${name} — try again shortly.`;
}

/** Live-progress line for the importing message (from a poll snapshot). */
export function importProgressMessage(title: string, p: ImportProgress): string {
  const name = `<b>${escapeHtml(title)}</b>`;
  const step = p.step ? p.step.replace(/_/g, " ") : "working";
  const counts =
    p.processed != null && p.total != null && p.total > 0
      ? ` ${p.processed}/${p.total}`
      : "";
  return `⏳ Importing ${name} — ${escapeHtml(step)}${counts}…`;
}

/** Final message after the completion webhook fires. */
export function importDoneMessage(
  title: string,
  ok: boolean,
  importedVideos?: number,
  error?: string,
): string {
  const name = `<b>${escapeHtml(title)}</b>`;
  if (!ok) {
    return `❌ Import of ${name} failed${error ? `: ${escapeHtml(error)}` : ""}.`;
  }
  const n = importedVideos != null ? ` (${importedVideos} videos)` : "";
  return `✅ ${name} is ready${n} — try <code>/askchannel</code> to ask it anything.`;
}
