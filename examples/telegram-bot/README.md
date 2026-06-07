# AskChannel Telegram bot example

A complete Telegram bot with a **searchable inline channel-picker**, built on
[`@askchannelai/sdk`](../../packages/sdk) +
[`@askchannelai/telegram`](../../packages/telegram) and
[grammY](https://grammy.dev).

- `/askchannel @handle <question>` — ask a channel directly
- `/askchannel` — replies with a **🔍 Search channels** button
- `@yourbot <name>` — inline dropdown of indexed channels; pick one, then reply
  with your question

It's stateless — the picked channel rides in the prompt text (an `ask=` link) and
is recovered from your reply. ~120 lines, almost all grammY wiring: the
AskChannel-specific glue (search dropdown, reply recovery, answer/error render)
is imported from `@askchannelai/telegram`.

## Run it

```bash
# from the monorepo root, once:
npm install
npm run build      # builds @askchannelai/sdk + @askchannelai/telegram (the example imports the built packages)

# then:
cd examples/telegram-bot
cp .env.example .env                  # fill in both tokens
npm run dev
```

You need:

1. A bot token from [@BotFather](https://t.me/BotFather) (`/newbot`).
2. A premium AskChannel API token (`askchannelai_…`) from your account → API.
3. **Inline mode enabled** in @BotFather: `/setinline` → pick your bot → set a
   placeholder. Without this, the `@yourbot …` dropdown silently does nothing.

This example uses **long-polling** (no public URL needed), so it's the fastest
way to try the flow locally. For production you'd typically switch to a webhook
— see grammY's [hosting guides](https://grammy.dev/hosting/).

## What to copy into your own bot

The AskChannel-specific parts are tiny — one SDK client plus a few helpers:

```ts
import { createAskChannelClient } from "@askchannelai/sdk";
import {
  buildInlineResults,        // SDK channels → inline-dropdown rows
  channelRefFromPickReply,   // recover the picked channel from a reply (stateless)
  qaErrorMessage,            // friendly HTML for a failed ask()
} from "@askchannelai/telegram";

const ac = createAskChannelClient({ token: process.env.ASKCHANNEL_TOKEN });

const channels = await ac.searchChannels(query);                 // dropdown source
const res = await ac.ask({ channel, question, platform: "telegram" });
bot.api.sendMessage(chatId, res.rendered, { parse_mode: "HTML" }); // ready to send
```

`@askchannelai/telegram` is Telegram-specific (it emits Telegram HTML), but it
works with grammY, Telegraf, or raw Bot API calls. For Discord/Slack/WhatsApp,
drop the helpers and send the SDK's `rendered` field directly — see the per-platform
snippets in the [API docs](https://askchannel.ai/api-docs).
