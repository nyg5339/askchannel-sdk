/**
 * Inline-mode channel picker — browse/search AskChannel's indexed channels from
 * a Telegram dropdown instead of typing an exact `@handle`.
 *
 * Flow (fully stateless — no store):
 *   1. A "🔍 Search channels" button (`switch_inline_query_current_chat`) opens
 *      inline mode.
 *   2. The user types a name → an `inline_query` arrives → you call
 *      `searchChannels` (SDK) and answer with {@link buildInlineResults}.
 *   3. The user taps a channel → Telegram sends {@link pickPromptMessage} into
 *      the chat (`via_bot`), carrying the channel's QA route ref in a link.
 *   4. The user REPLIES with their question → {@link channelRefFromPickReply}
 *      recovers the channel and you run the normal `ask` passthrough.
 */
import type { Channel } from "@askchannelai/sdk";
import { escapeHtml } from "./html.js";
import type { InlineQueryResultArticle } from "./types.js";

/** Default AskChannel web origin used for the pick-prompt's "open on the web" link. */
const DEFAULT_BASE_URL = "https://askchannel.ai";

/** Query param embedded in the pick-prompt link that carries the channel's QA
 *  route ref (handle or id), recovered when the user replies. */
const ASK_PARAM = "ask";

/** The minimal `reply_to_message` fields read to recover a picked channel. */
type PickReplyMessage = {
  via_bot?: { username?: string };
  entities?: { type: string; url?: string }[];
};

/** Options shared by the prompt + dropdown builders. */
export type PickerOptions = {
  /** AskChannel web origin for the pick-prompt link. Default `https://askchannel.ai`. */
  baseUrl?: string;
};

/** Prefer the handle (without `@`) as the QA route ref; fall back to the id.
 *  Both are accepted by `AskChannelClient.ask({ channel })`. */
export function askRef(c: Channel): string {
  return c.handle ? c.handle.replace(/^@+/, "") : c.id;
}

/**
 * Gate the inline dropdown behind an explicit `/askchannel` prefix: only an
 * inline query of the form `/askchannel [name]` opens the picker. Returns the
 * trimmed search term (possibly "") when the prefix is present, or null to
 * suppress the dropdown. Tolerates the optional `@botname` command suffix.
 */
export function parseInlineAskChannelQuery(query: string): string | null {
  const m = query
    .trim()
    .match(/^\/askchannel(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  if (!m) return null;
  return (m[1] ?? "").trim();
}

/**
 * The message sent when a user taps a channel. The trailing link both opens the
 * channel on the web AND carries the QA route ref so the reply handler can
 * recover which channel was picked — keeping the flow stateless. Send with
 * `parse_mode: "HTML"`.
 */
export function pickPromptMessage(c: Channel, opts: PickerOptions = {}): string {
  const baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const handlePart = c.handle ? ` (${escapeHtml(c.handle)})` : "";
  const link =
    `${baseUrl}/chat?channel_id=${encodeURIComponent(c.id)}` +
    `&${ASK_PARAM}=${encodeURIComponent(askRef(c))}`;
  return (
    `🎙️ <b>${escapeHtml(c.title)}</b>${handlePart}\n\n` +
    `💬 <b>Reply to this message</b> with your question for this channel.\n` +
    `<a href="${link}">Open ${escapeHtml(c.title)} on the web ↗</a>`
  );
}

/** Map SDK channels into inline-dropdown articles. */
export function buildInlineResults(
  channels: Channel[],
  opts: PickerOptions = {},
): InlineQueryResultArticle[] {
  return channels.map((c) => {
    const description =
      [c.handle, c.videoCount ? `${c.videoCount} videos` : ""]
        .filter(Boolean)
        .join(" · ") || undefined;
    return {
      type: "article" as const,
      id: askRef(c).slice(0, 64),
      title: c.title,
      description,
      ...(c.thumbnail ? { thumbnail_url: c.thumbnail } : {}),
      input_message_content: {
        message_text: pickPromptMessage(c, opts),
        parse_mode: "HTML" as const,
        link_preview_options: { is_disabled: true },
      },
    };
  });
}

/**
 * Recover the picked channel's QA route ref from a reply's `reply_to_message`.
 * Returns null unless the replied-to message was one of YOUR inline-picker
 * prompts (verified via `via_bot`) and carries an `ask=` text_link — so a reply
 * to any other message is ignored and falls through to your normal handling.
 */
export function channelRefFromPickReply(
  reply: PickReplyMessage,
  botUsername: string,
): string | null {
  const self = botUsername.toLowerCase().replace(/^@+/, "");
  if (reply.via_bot?.username?.toLowerCase() !== self) return null;
  for (const e of reply.entities ?? []) {
    if (e.type === "text_link" && typeof e.url === "string") {
      const m = e.url.match(/[?&]ask=([^&]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
    }
  }
  return null;
}
