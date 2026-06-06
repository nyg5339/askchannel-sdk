import { AskChannelError, codeForStatus } from "./errors.js";
import type {
  AskParams,
  AskResponse,
  Channel,
  ClientOptions,
  Provider,
} from "./types.js";

const DEFAULT_BASE_URL = "https://askchannel.ai";
const DEFAULT_TIMEOUT_MS = 70_000;
const UC_ID_RE = /^UC[\w-]{22}$/;

/** Normalize a channel ref: raw `UC…` ids pass through; everything else is
 *  treated as a handle and gets a single leading `@`. */
function normalizeChannelRef(channel: string): string {
  const ref = channel.trim();
  if (UC_ID_RE.test(ref)) return ref;
  return "@" + ref.replace(/^@+/, "");
}

/** Ensure a single leading `@` on a non-empty handle. */
function toHandle(customUrl?: string | null): string | undefined {
  if (!customUrl) return undefined;
  const h = customUrl.replace(/^@+/, "").trim();
  return h ? "@" + h : undefined;
}

/**
 * Client for the AskChannel (datingai) public API.
 *
 * @example
 * ```ts
 * const ac = new AskChannelClient({ token: process.env.ASKCHANNEL_TOKEN });
 * const res = await ac.ask({ channel: "@hubermanlab", question: "best time for coffee?" });
 * console.log(res.answer);
 * ```
 */
export class AskChannelClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly defaultProvider: Provider;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.token = opts.token;
    this.defaultProvider = opts.defaultProvider ?? "gemini";
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const f = opts.fetch ?? globalThis.fetch;
    if (typeof f !== "function") {
      throw new Error(
        "No fetch available. Use Node 18+, or pass `fetch` in ClientOptions.",
      );
    }
    this.fetchImpl = f;
  }

  /**
   * Ask a cited question over a channel. Requires a premium token.
   *
   * @throws {AskChannelError} on any non-2xx response or network failure.
   */
  async ask(params: AskParams): Promise<AskResponse> {
    if (!this.token) {
      throw new AskChannelError("A premium token is required to ask questions.", {
        status: 0,
        code: "unauthorized",
      });
    }
    const ref = normalizeChannelRef(params.channel);
    const url = `${this.baseUrl}/api/channel/qa/${encodeURIComponent(ref)}`;
    const body: Record<string, unknown> = {
      question: params.question,
      provider: params.provider ?? this.defaultProvider,
    };
    if (params.platform) body.platform = params.platform;

    const data = await this.request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
      signal: params.signal,
      timeoutMs: params.timeoutMs,
      op: "ask",
    });

    return data as AskResponse;
  }

  /**
   * Search AskChannel's **indexed** channels (the ones you can ask) by title or
   * handle. Public — no token needed. Returns [] for an empty query.
   *
   * @throws {AskChannelError} only on a hard transport failure; a 4xx/5xx from
   * search resolves to an empty list rather than throwing, to keep typeahead
   * dropdowns resilient.
   */
  async searchChannels(
    query: string,
    opts: { signal?: AbortSignal; timeoutMs?: number } = {},
  ): Promise<Channel[]> {
    const q = query.trim();
    if (!q) return [];
    const url = `${this.baseUrl}/api/channels/search/local?q=${encodeURIComponent(q)}`;
    let data: unknown;
    try {
      data = await this.request(url, {
        method: "GET",
        signal: opts.signal,
        timeoutMs: opts.timeoutMs ?? 8_000,
        op: "searchChannels",
        // Search degrades to [] on HTTP errors instead of throwing.
        softErrors: true,
      });
    } catch {
      return [];
    }
    if (!data) return [];
    const rows = (data as { channels?: RawChannel[] }).channels ?? [];
    return rows.map((c) => this.mapChannel(c));
  }

  private mapChannel(c: RawChannel): Channel {
    const thumbnail = c.thumbnail
      ? c.thumbnail.startsWith("http")
        ? c.thumbnail
        : `${this.baseUrl}${c.thumbnail}`
      : undefined;
    return {
      id: c.id,
      title: c.title,
      description: c.description || undefined,
      thumbnail,
      customUrl: c.custom_url || undefined,
      handle: toHandle(c.custom_url),
      videoCount: c.videoCount,
      subscriberCount: c.subscriberCount,
    };
  }

  /** Shared fetch with timeout + uniform error mapping. */
  private async request(
    url: string,
    opts: {
      method: "GET" | "POST";
      headers?: Record<string, string>;
      body?: string;
      signal?: AbortSignal;
      timeoutMs?: number;
      op: string;
      softErrors?: boolean;
    },
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? this.timeoutMs);
    // Forward an external abort signal into our controller.
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: opts.method,
        headers: opts.headers,
        body: opts.body,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (cause) {
      throw new AskChannelError(`AskChannel ${opts.op} request failed`, {
        status: 0,
        code: "network",
        cause,
      });
    } finally {
      clearTimeout(timeout);
    }

    const payload = await res.json().catch(() => undefined);

    if (!res.ok) {
      if (opts.softErrors) return undefined;
      const message =
        (payload && typeof payload === "object" &&
          ((payload as Record<string, unknown>).message ||
            (payload as Record<string, unknown>).error)) ||
        `AskChannel ${opts.op} failed (HTTP ${res.status})`;
      throw new AskChannelError(String(message), {
        status: res.status,
        code: codeForStatus(res.status),
        details: payload,
      });
    }

    return payload;
  }
}

/** Raw row shape from /api/channels/search/local. */
interface RawChannel {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  custom_url?: string | null;
  videoCount?: string;
  subscriberCount?: string;
}

/** Convenience factory mirroring `new AskChannelClient(opts)`. */
export function createAskChannelClient(opts?: ClientOptions): AskChannelClient {
  return new AskChannelClient(opts);
}
