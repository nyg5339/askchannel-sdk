# @askchannelai/telegram

Telegram glue for [AskChannel](https://askchannel.ai) bots, on top of
[`@askchannelai/sdk`](../sdk). Pure, dependency-free helpers that turn inbound
Telegram text into AskChannel calls and turn AskChannel responses into
**ready-to-send HTML** — so you write almost no glue.

Your bot keeps the token, the HTTP, and the platform wiring; this package owns
the AskChannel-specific parts:

- **Parse** `/askchannel @handle …` commands and `@handle` mentions into
  `{ channel, question }`.
- **Build** the inline channel-picker dropdown (`searchChannels` → articles).
- **Recover** a picked channel from the user's reply — fully stateless.
- **Render** answer errors and the whole **import** flow (search → confirm cost
  → progress → done) as HTML strings.

Works with [grammY](https://grammy.dev), [Telegraf](https://telegraf.js.org), or
raw Bot API calls; long-polling or webhooks.

## Install

```bash
npm install @askchannelai/sdk @askchannelai/telegram
```

`@askchannelai/sdk` is a **peer dependency** (the error renderers narrow on the
SDK's `AskChannelError`), so install both.

## Quick start (grammY)

```ts
import { Bot } from "grammy";
import { createAskChannelClient } from "@askchannelai/sdk";
import {
  buildInlineResults,
  channelRefFromPickReply,
  qaErrorMessage,
} from "@askchannelai/telegram";

const ac = createAskChannelClient({ token: process.env.ASKCHANNEL_TOKEN });
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// Inline dropdown of indexed channels.
bot.on("inline_query", async (ctx) => {
  const channels = await ac.searchChannels(ctx.inlineQuery.query);
  await ctx.answerInlineQuery(buildInlineResults(channels));
});

// A reply to a picked channel = the question for it.
bot.on("message:text", async (ctx) => {
  const reply = ctx.message.reply_to_message;
  const ref = reply
    ? channelRefFromPickReply(
        { via_bot: reply.via_bot, entities: reply.entities },
        ctx.me.username,
      )
    : null;
  if (!ref) return;
  try {
    const res = await ac.ask({ channel: ref, question: ctx.message.text, platform: "telegram" });
    await ctx.reply(res.rendered as string, { parse_mode: "HTML" });
  } catch (e) {
    await ctx.reply(qaErrorMessage(ref, e), { parse_mode: "HTML" });
  }
});
```

See [`examples/telegram-bot`](../../examples/telegram-bot) for the full bot
(commands, search button, placeholder-then-edit).

## API

All helpers are pure (no I/O, no env). Anything that needs your bot's username
or web origin takes it as an argument.

### Ask flow

| Export | Description |
|--------|-------------|
| `parseChannelMention(text, botUsername)` | Pull `{ handle, prompt }` from a message that @-mentions a channel (never your own bot). `null` if none. |
| `parseAskChannelCommand(text, botUsername)` | Parse `/askchannel @handle …` (tolerates `/askchannel@yourbot`). Returns `ok` \| `usage` \| `null`. |
| `qaErrorMessage(handle, error)` | Friendly HTML for a failed `ask()`, keyed on `AskChannelError.code`. |
| `ASKCHANNEL_USAGE` | Usage-hint HTML string. |

### Inline channel picker

| Export | Description |
|--------|-------------|
| `parseInlineAskChannelQuery(query)` | Gate the dropdown behind a `/askchannel` inline prefix; returns the search term or `null`. |
| `buildInlineResults(channels, { baseUrl? })` | SDK channels → inline-query article rows. |
| `pickPromptMessage(channel, { baseUrl? })` | The HTML message sent when a channel is tapped (carries the channel ref in an `ask=` link). |
| `channelRefFromPickReply(reply, botUsername)` | Recover the picked channel's ref from a reply. Stateless. |
| `askRef(channel)` | The channel's QA route ref (handle without `@`, else id). |

### Import flow (`/askchannel-import`)

| Export | Description |
|--------|-------------|
| `IMPORT_INLINE_PREFIX`, `IMPORT_CALLBACK_RE` | The inline prefix and the `aci:go\|x:<UCid>` callback-data pattern. |
| `parseInlineImportQuery(query)` | Gate the import dropdown behind `/askchannel-import`. |
| `buildImportInlineResults(channels)` | YouTube search results → inline article rows. |
| `importChannelIdFromMessage(msg, botUsername)` | Recover the `UC…` id from a picked import-prompt. |
| `importConfirmMessage(quote)` | Cost-confirm message + `✅ Import` / `✖ Cancel` keyboard. |
| `importStartedMessage` / `importProgressMessage` / `importDoneMessage` | Lifecycle copy for triggered / polling / completed imports. |
| `importErrorMessage(error, title)`, `quoteLabel(quote)`, `importLabelFromMessage(msg)` | Error copy and display-label helpers. |

### Utilities

| Export | Description |
|--------|-------------|
| `escapeHtml(s)` | Escape `&`, `<`, `>` for `parse_mode: "HTML"`. |
| Types | `InlineKeyboardButton`, `InlineKeyboardMarkup`, `InlineQueryResultArticle`, `ChannelMention`, `AskChannelCommand`, `PickerOptions`. |

## License

MIT
