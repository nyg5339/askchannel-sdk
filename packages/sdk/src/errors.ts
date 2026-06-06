/** Error types for the AskChannel SDK. */

/** Stable, switchable error codes mapped from HTTP status. */
export type AskChannelErrorCode =
  | "bad_request" // 400 — invalid question/provider/platform
  | "unauthorized" // 401 — token missing, invalid, revoked, or not premium
  | "quota_exceeded" // 403 — daily question limit reached for the token
  | "not_found" // 404 — channel not indexed
  | "rate_limited" // 429 — too many requests (burst limit)
  | "server_error" // 5xx — AskChannel outage
  | "network" // request never completed (DNS, timeout, abort)
  | "unknown"; // anything else

const CODE_BY_STATUS: Record<number, AskChannelErrorCode> = {
  400: "bad_request",
  401: "unauthorized",
  403: "quota_exceeded",
  404: "not_found",
  429: "rate_limited",
};

export function codeForStatus(status: number): AskChannelErrorCode {
  if (CODE_BY_STATUS[status]) return CODE_BY_STATUS[status];
  if (status >= 500) return "server_error";
  return "unknown";
}

/** Thrown by all SDK calls on failure. Inspect `.code` (or `.status`). */
export class AskChannelError extends Error {
  /** HTTP status, or 0 when the request never completed. */
  readonly status: number;
  readonly code: AskChannelErrorCode;
  /** Raw server payload, when one was returned. */
  readonly details?: unknown;

  constructor(
    message: string,
    opts: { status: number; code: AskChannelErrorCode; details?: unknown; cause?: unknown },
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "AskChannelError";
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

/** Narrowing helper. */
export function isAskChannelError(e: unknown): e is AskChannelError {
  return e instanceof AskChannelError;
}
