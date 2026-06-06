# @askchannel/sdk

Tiny, **dependency-free** TypeScript client for the [AskChannel](https://askchannel.ai)
API. Ask cited questions over a YouTube channel's transcripts and search the
channels you can ask. Works anywhere `fetch` exists — bots, web apps, edge, CLIs.

```bash
npm i @askchannel/sdk
```

> Requires Node 18+ (or any runtime with a global `fetch`).

## Quick start

```ts
import { createAskChannelClient } from "@askchannel/sdk";

const ac = createAskChannelClient({ token: process.env.ASKCHANNEL_TOKEN });

const res = await ac.ask({
  channel: "@hubermanlab",          // @handle (with/without @) or a UC… id
  question: "What's the best time to drink coffee?",
});

console.log(res.answer);            // clean prose, no inline markers
for (const c of res.citations) {
  console.log(`${c.videoTitle} → ${c.url}`); // deep-linked to the timestamp
}
```

## Get a token

`ask()` needs a **premium** AskChannel API token (starts with `askchannelai_`),
created in your AskChannel account (Account → API). One token = one account; all
calls share that account's daily question quota. `searchChannels()` is public
and needs no token.

## Ready-to-send chat rendering

Pass `platform` and the response gains a `rendered` field already formatted for
that app — so a bot can forward it verbatim with no citation-formatting code:

```ts
const res = await ac.ask({
  channel: "@lexfridman",
  question: "What does he think about AGI timelines?",
  platform: "telegram",            // telegram | discord | whatsapp | slack
});

// HTML for telegram, mrkdwn for slack/whatsapp:
bot.sendMessage(chatId, res.rendered as string, { parse_mode: "HTML" });
// discord returns { content, embeds } instead of a string.
```

## Search the channels you can ask

```ts
const channels = await ac.searchChannels("rogan");
// → [{ id, title, handle: "@joerogan", thumbnail, videoCount, ... }]
```

This hits the **indexed-channels** search (only channels already on AskChannel),
which is what you want for a "pick a channel" dropdown. Returns `[]` for an empty
query and degrades to `[]` (rather than throwing) on a search-side error.

## Errors

Every call throws `AskChannelError` on failure, with a stable `code` you can
switch on:

```ts
import { isAskChannelError } from "@askchannel/sdk";

try {
  await ac.ask({ channel: "@unknown", question: "hi" });
} catch (e) {
  if (isAskChannelError(e)) {
    switch (e.code) {
      case "not_found":      /* channel not indexed */ break;
      case "quota_exceeded": /* 403 daily limit */ break;
      case "unauthorized":   /* 401 bad/non-premium token */ break;
      case "rate_limited":   /* 429 burst */ break;
      case "server_error":   /* 5xx outage */ break;
      case "network":        /* timeout / DNS / abort */ break;
    }
  }
}
```

## API

### `new AskChannelClient(options)` / `createAskChannelClient(options)`

| Option | Default | Notes |
|--------|---------|-------|
| `token` | — | Premium `askchannelai_…` token. Required for `ask()`. |
| `baseUrl` | `https://askchannel.ai` | API origin. |
| `defaultProvider` | `gemini` | `gemini` (faster) or `claude`. |
| `timeoutMs` | `70000` | Default per-call timeout. |
| `fetch` | global `fetch` | Inject a custom fetch. |

### `ask(params) → Promise<AskResponse>`
`{ channel, question, provider?, platform?, signal?, timeoutMs? }` →
`{ answer, citations[], provider, rendered? }`.

### `searchChannels(query, opts?) → Promise<Channel[]>`
Indexed-channel search by title or handle.

## Building a Telegram bot?

See [`examples/telegram-bot`](../../examples/telegram-bot) — a complete bot with
an inline channel-picker dropdown built on this SDK.

## License

MIT
