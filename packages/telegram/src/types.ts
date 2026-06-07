/**
 * The Telegram Bot API shapes the render helpers produce. Each is a structural
 * subset of the full Bot API type, so the objects assign cleanly to both a raw
 * Bot API call (`POST /answerInlineQuery`, `editMessageText`, …) and a typed
 * framework like grammY (`ctx.answerInlineQuery`, `ctx.reply`).
 */

/**
 * An inline-keyboard button — a callback button (tap fires a `callback_query`
 * your bot handles), a URL button, or the `switch_inline_query_current_chat`
 * button that prefills the input box and opens inline mode (the entry point to
 * the channel-picker dropdown). Each button carries exactly one action field.
 */
export type InlineKeyboardButton =
  | { text: string; callback_data: string }
  | { text: string; url: string }
  | { text: string; switch_inline_query_current_chat: string };

/** A Telegram `InlineKeyboardMarkup`: one row per outer array entry. */
export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

/**
 * One `article` result in an inline-mode dropdown — a titled row that, when
 * tapped, sends `input_message_content` into the chat on the user's behalf.
 * https://core.telegram.org/bots/api#inlinequeryresultarticle
 */
export type InlineQueryResultArticle = {
  type: "article";
  /** Must be ≤64 bytes — Telegram rejects longer ids. */
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  input_message_content: {
    message_text: string;
    parse_mode?: "HTML";
    link_preview_options?: { is_disabled?: boolean };
  };
};
