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

/** A no-side-effects cost estimate for importing a channel. */
export interface ImportQuote {
  /** Resolved `UC…` channel id. */
  channelId: string;
  title: string;
  handle?: string;
  /**
   * Estimated importable video count. Estimated from the channel's total video
   * count (every video treated as importable — an upper bound, Shorts included);
   * the exact Shorts-excluded count is billed at import time. Equals `total`.
   */
  importable: number;
  /** Total videos on the channel. */
  total: number;
  /** Estimated credit cost = `ceil(total / 10)` (1 credit per 10 videos). */
  creditCost: number;
  /** Current credit balance, or null for unlimited accounts. */
  balance: number | null;
  /** Whether the account can afford the import right now. */
  hasEnough: boolean;
}

/** Parameters for {@link AskChannelClient.importChannel}. */
export interface ImportParams {
  /** A YouTube channel URL, `@handle`, or `UC…` id to import. */
  channel: string;
  /**
   * Optional HTTPS URL AskChannel will POST when the import completes or fails
   * (signed with `X-AskChannel-Signature`). Lets a bot react without polling.
   */
  callbackUrl?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Result of triggering an import. The pipeline runs async afterwards. */
export interface ImportResult {
  /** The channel row (public shape). */
  channel: { id: string; title?: string; custom_url?: string | null; [k: string]: unknown };
  /** True when this call registered a brand-new channel. */
  isNew: boolean;
  /** True when the channel was already indexed — nothing to do. */
  alreadyImported: boolean;
  /** True when queued behind another in-flight import (starts automatically). */
  queued: boolean;
  /** Run id, present when the import started immediately (not queued). */
  runId?: string;
  /** Credit charge summary, when a new import was kicked off. */
  importCredits?: { status?: string; credits: number; balance: number };
}

/** A snapshot of import progress (from polling). */
export interface ImportProgress {
  channelId: string;
  /** Pipeline status: running | completed | failed | null (not started). */
  status: "running" | "completed" | "failed" | null;
  /** Current phase, e.g. fetching | transcribing | cleanup | embedding | done. */
  step?: string;
  message?: string;
  /** Videos processed so far / total importable, when known. */
  processed?: number;
  total?: number;
  /** Convenience: true once status is completed or failed. */
  done: boolean;
}

/** Payload AskChannel POSTs to your `callbackUrl` on import completion/failure. */
export interface ImportWebhookEvent {
  event: "import.completed" | "import.failed";
  channelId: string;
  handle?: string;
  title?: string;
  status: "completed" | "failed";
  /** Videos imported, on success. */
  importedVideos?: number;
  /** Failure detail, on `import.failed`. */
  error?: string;
  runId?: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
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
