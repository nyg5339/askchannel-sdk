/** Public types for the AskChannel SDK. */

/** LLM provider for the answer. `gemini` is the default and faster path. */
export type Provider = "gemini" | "claude";

/** Chat platform to pre-render the answer for. */
export type ChatPlatform = "telegram" | "discord" | "whatsapp" | "slack";

/** A single citation, anchored to a video timestamp. */
export interface Citation {
  /** YouTube video id. */
  videoId: string;
  videoTitle: string;
  /** Citation start time, in seconds. */
  startTime: number;
  /** Citation end time, in seconds. */
  endTime: number;
  /** The cited transcript passage. */
  text: string;
  /** Deep link to the video at the cited timestamp. */
  url: string;
}

/** Discord's pre-rendered shape (returned as `rendered` when platform=discord). */
export interface DiscordRendered {
  content: string;
  embeds: Array<{
    title?: string;
    fields?: Array<{ name: string; value: string }>;
  }>;
}

/**
 * `rendered` is a ready-to-send string for telegram/whatsapp/slack (HTML for
 * telegram, mrkdwn for slack/whatsapp) and a `{ content, embeds }` object for
 * discord. Only present when you pass a `platform`.
 */
export type Rendered = string | DiscordRendered;

/** Parameters for {@link AskChannelClient.ask}. */
export interface AskParams {
  /**
   * The channel to ask: an `@handle` (with or without the `@`) or a raw
   * `UC…` channel id. The channel must already be indexed on AskChannel.
   */
  channel: string;
  /** The question to answer from the channel's transcripts. */
  question: string;
  /** Override the default provider for this call. */
  provider?: Provider;
  /**
   * Pre-render the answer for a chat platform. When set, the response gains a
   * `rendered` field; `answer` + `citations` are always returned regardless.
   */
  platform?: ChatPlatform;
  /** Abort signal to cancel the request. */
  signal?: AbortSignal;
  /** Per-call timeout in ms (overrides the client default). */
  timeoutMs?: number;
}

/** Response from {@link AskChannelClient.ask}. */
export interface AskResponse {
  /** Clean prose answer — no inline citation markers (those are in `citations`). */
  answer: string;
  citations: Citation[];
  provider: Provider;
  /** Present only when `platform` was set. See {@link Rendered}. */
  rendered?: Rendered;
}

/** A channel returned by {@link AskChannelClient.searchChannels}. */
export interface Channel {
  /** `UC…` channel id. */
  id: string;
  title: string;
  description?: string;
  /** Absolute thumbnail URL (relative paths are resolved against baseUrl). */
  thumbnail?: string;
  /** Raw stored handle (already carries a leading `@` when present). */
  customUrl?: string;
  /** Normalized handle, always `@…` when the channel has one (else undefined). */
  handle?: string;
  /** Number of indexed videos, as a string (as the API returns it). */
  videoCount?: string;
  subscriberCount?: string;
}

/** Options for constructing an {@link AskChannelClient}. */
export interface ClientOptions {
  /**
   * A premium AskChannel API token (starts with `askchannelai_`). Required for
   * {@link AskChannelClient.ask}; channel search is public and works without it.
   */
  token?: string;
  /** API origin. Defaults to `https://askchannel.ai`. No trailing slash needed. */
  baseUrl?: string;
  /** Default provider for {@link AskChannelClient.ask}. Defaults to `gemini`. */
  defaultProvider?: Provider;
  /** Default per-call timeout in ms. Defaults to 70000 (the API caps QA at ~60s). */
  timeoutMs?: number;
  /** Inject a custom fetch (tests, proxies, non-global-fetch runtimes). */
  fetch?: typeof fetch;
}
