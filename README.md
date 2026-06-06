# AskChannel SDK

Official, open-source tooling for building on the [AskChannel](https://askchannel.ai)
API — ask cited questions over a YouTube channel's transcripts.

## Packages

| Package | Description |
|---------|-------------|
| [`@askchannelai/sdk`](packages/sdk) | Tiny, dependency-free API client. Works in any bot, web app, or CLI. |

## Examples

| Example | Description |
|---------|-------------|
| [`telegram-bot`](examples/telegram-bot) | A Telegram bot with an inline channel-picker dropdown, built on the SDK. |

## Develop

```bash
npm install          # installs all workspaces
npm run build        # builds @askchannelai/sdk
npm run typecheck
```

## Publish the SDK

```bash
npm run build -w @askchannelai/sdk
npm publish -w @askchannelai/sdk    # requires access to the @askchannelai npm org
```

## License

MIT
