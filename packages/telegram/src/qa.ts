/**
 * Ask-a-channel command parsing + answer/error rendering.
 *
 * These turn raw inbound Telegram text into a `{ handle, prompt }` you can pass
 * straight to `AskChannelClient.ask`, and turn a failed `ask` into friendly,
 * code-keyed HTML you can send back. All pure — no I/O, no env — so the host
 * owns the bot token, the HTTP, and where `botUsername` comes from.
 */
import { isAskChannelError } from "@askchannelai/sdk";
import { escapeHtml } from "./html.js";

/** A parsed ask: the channel handle (no leading `@`) and the question to ask. */
export type ChannelMention = { handle: string; prompt: string };

/** Substituted when the user names a channel but asks nothing. */
const DEFAULT_PROMPT = "What's your overall take right now?";

/** Normalize a bot username: lowercased, no leading `@`. */
function norm(botUsername: string): string {
  return botUsername.toLowerCase().replace(/^@+/, "");
}

/**
 * If `text` @-mentions a handle that isn't `botUsername`, return that handle
 * plus the remaining text as the prompt; returns null otherwise so the caller
 * can fall through to its own routing. The first qualifying mention wins, and a
 * stray mention of your own bot is stripped from the prompt too.
 *
 * Telegram usernames are `[A-Za-z0-9_]{5,32}`; YouTube handles also allow `.`
 * and `-`, so a slightly wider charset is accepted.
 */
export function parseChannelMention(
  text: string,
  botUsername: string,
): ChannelMention | null {
  const self = norm(botUsername);
  const re = /@([A-Za-z0-9_.\-]{2,40})/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const handle = m[1];
    if (!handle || handle.toLowerCase() === self) continue; // never ourselves
    const prompt = text
      .replace(m[0], "")
      .replace(new RegExp(`@${self}\\b`, "ig"), "")
      .replace(/\s+/g, " ")
      .trim();
    return { handle, prompt: prompt || DEFAULT_PROMPT };
  }
  return null;
}

/** Usage hint to show when `/askchannel` is sent without a handle. */
export const ASKCHANNEL_USAGE =
  "Usage: <code>/askchannel @handle your question</code>\n" +
  "e.g. <code>/askchannel @DefiantGatekeeper when is it time to sell?</code>";

/** Result of {@link parseAskChannelCommand}. */
export type AskChannelCommand =
  | { kind: "ok"; mention: ChannelMention }
  | { kind: "usage" }; // command present, but no handle given

/**
 * Parse an explicit `/askchannel` command. Returns null when the text isn't the
 * command at all, `usage` when it's present but missing a handle, or `ok` with
 * the parsed mention. Tolerates Telegram's group-disambiguation form
 * (`/askchannel@yourbot`) and an optional leading `@` on the handle.
 *
 * Useful when your bot reads raw message text (e.g. a webhook): slash-commands
 * reach bots even under Group Privacy, so this works in groups without the user
 * also @-mentioning the bot.
 */
export function parseAskChannelCommand(
  text: string,
  botUsername: string,
): AskChannelCommand | null {
  const m = text.match(/^\/askchannel(?:@([A-Za-z0-9_]+))?(?:\s+([\s\S]*))?$/i);
  if (!m) return null;
  // A @botname suffix, if present, must be us — ignore commands aimed at a
  // different bot sharing the group.
  if (m[1] && m[1].toLowerCase() !== norm(botUsername)) return null;

  const rest = (m[2] ?? "").trim();
  if (!rest) return { kind: "usage" };

  const parts = rest.split(/\s+/);
  const handle = (parts[0] ?? "").replace(/^@+/, "");
  if (!/^[A-Za-z0-9_.\-]{2,40}$/.test(handle)) return { kind: "usage" };

  const prompt = parts.slice(1).join(" ").trim();
  return { kind: "ok", mention: { handle, prompt: prompt || DEFAULT_PROMPT } };
}

/**
 * Map a failed `ask()` to friendly, user-facing HTML, keyed on the SDK's stable
 * `AskChannelError.code`. User/config problems (unknown handle, quota, bad
 * token) get specific copy; everything else gets a generic "try again". A
 * non-SDK error falls through to the network/default copy.
 */
export function qaErrorMessage(handle: string, error: unknown): string {
  const h = escapeHtml(handle.replace(/^@+/, ""));
  const code = isAskChannelError(error) ? error.code : "network";
  switch (code) {
    case "not_found":
      return `I don't have <b>@${h}</b> indexed yet.`;
    case "quota_exceeded":
      return "Daily question limit reached for this AskChannel token.";
    case "unauthorized":
      return "The AskChannel token is invalid, revoked, or not premium.";
    case "rate_limited":
      return "Too many questions right now — try again in a moment.";
    case "network":
      return `Couldn't reach <b>@${h}</b> right now — try again shortly.`;
    default:
      return `Couldn't get an answer from <b>@${h}</b>.`;
  }
}
