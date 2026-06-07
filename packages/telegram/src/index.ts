/**
 * @askchannelai/telegram — Telegram glue for AskChannel bots.
 *
 * Pure, dependency-free helpers on top of `@askchannelai/sdk`: parse inbound
 * commands into `{ channel, question }`, build the inline channel-picker
 * dropdown, recover a picked channel from a reply, and render ready-to-send
 * HTML for the ask + import flows. Your bot keeps the token, the HTTP, and the
 * platform wiring; this owns the AskChannel-specific Telegram glue.
 *
 * Works with any Telegram setup — grammY, Telegraf, or raw Bot API calls — and
 * with both long-polling and webhooks.
 */
export { escapeHtml } from "./html.js";
export type {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  InlineQueryResultArticle,
} from "./types.js";

export {
  parseChannelMention,
  parseAskChannelCommand,
  qaErrorMessage,
  ASKCHANNEL_USAGE,
} from "./qa.js";
export type { ChannelMention, AskChannelCommand } from "./qa.js";

export {
  parseInlineAskChannelQuery,
  pickPromptMessage,
  buildInlineResults,
  channelRefFromPickReply,
  askRef,
} from "./picker.js";
export type { PickerOptions } from "./picker.js";

export {
  IMPORT_INLINE_PREFIX,
  IMPORT_CALLBACK_RE,
  parseInlineImportQuery,
  buildImportInlineResults,
  importChannelIdFromMessage,
  importLabelFromMessage,
  quoteLabel,
  importConfirmMessage,
  importStartedMessage,
  importErrorMessage,
  importProgressMessage,
  importDoneMessage,
} from "./import.js";
