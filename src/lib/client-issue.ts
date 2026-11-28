import { z } from "zod";

/**
 * Loading problems a visitor's browser ran into, sent to /api/client-issue/
 * and written to the server log as one `[client-issue]` line each (hPanel →
 * Runtime logs). They show when the host's network (for example its HTTP/3)
 * stalls files for real visitors, which our own tests can't see.
 *
 * - `asset-retry`: a file or page payload didn't answer in time; the service
 *   worker asked again and the second try worked.
 * - `asset-failed`: both tries failed.
 * - `slow-load`: files of this page took very long (first visits too, before
 *   the service worker is installed).
 * - `error-page`: the error page was shown.
 * - `stale-reload`: the error page reloaded once because of a missing chunk.
 */
export const CLIENT_ISSUE_KINDS = [
  "asset-retry",
  "asset-failed",
  "slow-load",
  "error-page",
  "stale-reload",
] as const;

export const CLIENT_ISSUE_PATH = "/api/client-issue/";

/** A file that takes longer than this to load counts as slow. */
export const SLOW_LOAD_MS = 8000;

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\r\n\t]+/g, " ").slice(0, max))
    .optional();

export const clientIssueSchema = z.object({
  kind: z.enum(CLIENT_ISSUE_KINDS),
  /** The page or file, without the origin. */
  path: text(200),
  /** How long it took, in milliseconds. */
  ms: z.number().int().min(0).max(600_000).optional(),
  /** Network protocol (h2, h3…) when the browser reports it. */
  proto: text(12),
  /** Short extra: the file that was slow, the error's name and message… */
  detail: text(240),
});

export type ClientIssue = z.infer<typeof clientIssueSchema>;

export function parseClientIssue(body: unknown): ClientIssue | null {
  const r = clientIssueSchema.safeParse(body);
  return r.success ? r.data : null;
}

/** One log line: easy to search for and to count by kind. */
export function clientIssueLine(issue: ClientIssue, userAgent: string | null): string {
  const parts = [
    `[client-issue] ${issue.kind}`,
    issue.path ? `path=${issue.path}` : null,
    issue.ms !== undefined ? `ms=${issue.ms}` : null,
    issue.proto ? `proto=${issue.proto}` : null,
    issue.detail ? `detail=${JSON.stringify(issue.detail)}` : null,
    userAgent ? `ua=${JSON.stringify(userAgent.slice(0, 160))}` : null,
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * At most `limit` reports per key in each window, so one broken (or hostile)
 * browser can't flood the log.
 */
export function createRateLimit(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, { start: number; n: number }>();
  return (key: string): boolean => {
    const t = now();
    const h = hits.get(key);
    if (!h || t - h.start >= windowMs) {
      if (hits.size > 5000) hits.clear();
      hits.set(key, { start: t, n: 1 });
      return true;
    }
    h.n += 1;
    return h.n <= limit;
  };
}

/** Send a report from the page without slowing it down (fire and forget). */
export function reportClientIssue(issue: ClientIssue): void {
  try {
    const body = new Blob([JSON.stringify(issue)], { type: "application/json" });
    if (!navigator.sendBeacon(CLIENT_ISSUE_PATH, body)) {
      void fetch(CLIENT_ISSUE_PATH, { method: "POST", body, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // Reporting must never break the page.
  }
}
