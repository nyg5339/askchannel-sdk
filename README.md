# AskChannel SDK

Official, open-source tooling for building on the [AskChannel](https://askchannel.ai)
API — ask cited questions over a YouTube channel's transcripts.

## Packages

| Package | Description |
|---------|-------------|
| [`@askchannelai/sdk`](packages/sdk) | Tiny, dependency-free API client. Works in any bot, web app, or CLI. |
| [`@askchannelai/telegram`](packages/telegram) | Telegram glue on top of the SDK — parse commands, build the inline channel-picker dropdown, recover a picked channel from a reply, and render ready-to-send HTML for the ask + import flows. Works with grammY, Telegraf, or raw Bot API. |

## Examples

| Example | Description |
|---------|-------------|
| [`telegram-bot`](examples/telegram-bot) | A complete Telegram bot with a searchable inline channel-picker dropdown, built on `@askchannelai/sdk` + `@askchannelai/telegram` and [grammY](https://grammy.dev). ~120 lines, mostly framework wiring — the AskChannel-specific glue is imported. |

## Develop

```bash
npm install          # installs all workspaces
npm run build        # builds @askchannelai/sdk + @askchannelai/telegram
npm run typecheck
```

## Publish a package

```bash
npm run build -w @askchannelai/sdk
npm publish -w @askchannelai/sdk        # requires access to the @askchannelai npm org

npm run build -w @askchannelai/telegram
npm publish -w @askchannelai/telegram   # depends on @askchannelai/sdk (peer)
```

## License

MIT
