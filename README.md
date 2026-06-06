# AskChannel SDK

Official, open-source tooling for building on the [AskChannel](https://askchannel.ai)
API — ask cited questions over a YouTube channel's transcripts.

## Packages

| Package | Description |
|---------|-------------|
| [`@askchannel/sdk`](packages/sdk) | Tiny, dependency-free API client. Works in any bot, web app, or CLI. |

## Examples

| Example | Description |
|---------|-------------|
| [`telegram-bot`](examples/telegram-bot) | A Telegram bot with an inline channel-picker dropdown, built on the SDK. |

## Develop

```bash
npm install          # installs all workspaces
npm run build        # builds @askchannel/sdk
npm run typecheck
```

## Publish the SDK

```bash
npm run build -w @askchannel/sdk
npm publish -w @askchannel/sdk    # requires access to the @askchannel npm org
```

## License

MIT
