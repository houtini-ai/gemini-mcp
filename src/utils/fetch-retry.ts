/**
 * Retry wrapper for raw fetch() calls to the Gemini REST API.
 *
 * Corporate proxies, WSL2 mirrored networking and VPN/TUN setups drop
 * connections for a second or two at a time. Node's fetch surfaces those as a
 * TypeError('fetch failed') with a `cause` such as UND_ERR_CONNECT_TIMEOUT or
 * ECONNRESET, which used to fail every in-flight tool call at once. Those
 * requests never reached the API, so replaying them is safe. See issue #8.
 *
 * Retries are limited to transient failures: connection-level errors and the
 * gateway status codes below. A caller's own AbortSignal/timeout is honoured —
 * an aborted or timed-out request is never replayed.
 */

export const DEFAULT_RETRY_ATTEMPTS = 3;
export const MAX_RETRY_ATTEMPTS = 10;

/** Total attempts including the first; clamped to [1, MAX_RETRY_ATTEMPTS]. */
export function normalizeRetryAttempts(value: unknown, fallback = DEFAULT_RETRY_ATTEMPTS): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_RETRY_ATTEMPTS, Math.max(1, Math.floor(n)));
}

const TRANSIENT_ERROR_CODES = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN',
  'ENOTFOUND',
]);

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function errorCode(err: unknown): string {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.cause?.code ?? e?.code;
  return typeof code === 'string' ? code : '';
}

/**
 * True for connection-level failures that resolve on their own within seconds.
 * Deliberately excludes AbortError/TimeoutError: those come from the caller's
 * own deadline and must not be replayed.
 */
export function isTransientNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; message?: string };
  if (e.name === 'AbortError' || e.name === 'TimeoutError') return false;
  const code = errorCode(err);
  // A named cause decides: TLS/certificate failures, bad hostnames and the
  // like also arrive as 'fetch failed' but never resolve on their own.
  if (code) return TRANSIENT_ERROR_CODES.has(code);
  const msg = (e.message || '').toLowerCase();
  return msg.startsWith('fetch failed') || msg.includes('connect_timeout');
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
  onRetry?: FetchRetryOptions['onRetry'];
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Re-run an async operation while it fails with a transient network error.
 * Used around SDK calls whose fetch we don't own; the SDK's own retryOptions
 * is not used because it replaces non-retryable ApiErrors (status + API
 * message) with an opaque 'Non-retryable exception' string.
 */
export async function retryOnTransient<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = normalizeRetryAttempts(options.attempts);
  const baseDelayMs = options.baseDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const sleep = options.sleep ?? defaultSleep;
  const label = options.label ?? 'request';

  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isTransientNetworkError(err)) throw err;
      const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const reason = errorCode(err) || (err as Error).message;
      options.onRetry?.({ attempt, attempts, delayMs, reason: `${label}: ${reason}` });
      await sleep(delayMs);
    }
  }
}

export interface FetchRetryOptions {
  /** Total attempts including the first (default DEFAULT_RETRY_ATTEMPTS). 1 disables retries. */
  attempts?: number;
  /** First backoff delay; doubles each retry, capped at maxDelayMs. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Extra HTTP status codes to treat as retryable, in addition to 502/503/504. */
  retryStatusCodes?: Iterable<number>;
  /** Label for log lines. */
  label?: string;
  onRetry?: (info: { attempt: number; attempts: number; delayMs: number; reason: string }) => void;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

function isReplayableBody(body: BodyInit | null | undefined): boolean {
  if (body === undefined || body === null) return true;
  if (typeof body === 'string') return true;
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return true;
  if (typeof ArrayBuffer !== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body))) return true;
  // ReadableStream / FormData with streams: consumable once only.
  return false;
}

/**
 * fetch() that replays transient failures. Safe for the JSON POST bodies this
 * server sends (strings are re-sendable; a stream body is sent once only).
 */
export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit = {},
  options: FetchRetryOptions = {},
): Promise<Response> {
  const attempts = normalizeRetryAttempts(options.attempts);
  const baseDelayMs = options.baseDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const label = options.label ?? 'request';
  const retryStatuses = new Set<number>([...RETRYABLE_STATUS_CODES, ...(options.retryStatusCodes ?? [])]);
  const replayable = isReplayableBody(init.body);

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const isLast = attempt === attempts || !replayable;
    let reason: string;
    try {
      const response = await fetchImpl(input, init);
      if (!retryStatuses.has(response.status) || isLast) {
        return response;
      }
      // Release the keep-alive socket before retrying.
      await response.body?.cancel().catch(() => {});
      reason = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err;
      if (isLast || init.signal?.aborted || !isTransientNetworkError(err)) {
        throw err;
      }
      reason = errorCode(err) || (err as Error).message;
    }

    const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
    options.onRetry?.({ attempt, attempts, delayMs, reason: `${label}: ${reason}` });
    await sleep(delayMs);
  }

  // Unreachable: the loop returns or throws on its final attempt.
  throw lastError ?? new Error(`${label} failed after ${attempts} attempts`);
}
