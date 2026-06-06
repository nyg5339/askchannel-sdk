# AskChannel Telegram bot example

A complete Telegram bot with a **searchable inline channel-picker**, built on
[`@askchannelai/sdk`](../../packages/sdk) and [grammY](https://grammy.dev).

- `/askchannel @handle <question>` — ask a channel directly
- `/askchannel` — replies with a **🔍 Search channels** button
- `@yourbot <name>` — inline dropdown of indexed channels; pick one, then reply
  with your question

It's stateless — the picked channel rides in the prompt text and is recovered
from your reply. ~150 lines, mostly Telegram glue; the AskChannel calls are two
SDK methods (`searchChannels`, `ask`).

## Run it

```bash
# from the monorepo root, once:
npm install
npm run build -w @askchannelai/sdk      # the example imports the built SDK

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

The AskChannel-specific parts are tiny:

```ts
import { createAskChannelClient } from "@askchannelai/sdk";
const ac = createAskChannelClient({ token: process.env.ASKCHANNEL_TOKEN });

const channels = await ac.searchChannels(query);                 // dropdown
const res = await ac.ask({ channel, question, platform: "telegram" });
bot.sendMessage(chatId, res.rendered, { parse_mode: "HTML" });   // ready to send
```

Everything else is standard Telegram/grammY plumbing you can adapt to Discord,
Slack, or any platform the SDK's `platform` option supports.
