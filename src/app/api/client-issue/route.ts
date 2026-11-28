import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config";
import { clientIssueLine, createRateLimit, parseClientIssue } from "@/lib/client-issue";

/** Per browser address: a few reports a minute is plenty to see a problem. */
const perVisitor = createRateLimit(20, 60_000);
/** All visitors together, so a storm can't fill the log. */
const overall = createRateLimit(600, 60_000);

/**
 * Loading problems reported by visitors' browsers (src/lib/client-issue.ts):
 * the service worker after a stalled file, the error page, a slow first load.
 * Each one becomes a `[client-issue]` line in the server log; nothing is stored.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(site.url).origin && origin !== request.nextUrl.origin)
    return new NextResponse(null, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!perVisitor(ip) || !overall("all")) return new NextResponse(null, { status: 429 });
  const text = await request.text().catch(() => "");
  if (text.length > 4000) return new NextResponse(null, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON: rejected below.
  }
  const issue = parseClientIssue(body);
  if (!issue) return new NextResponse(null, { status: 400 });
  console.warn(clientIssueLine(issue, request.headers.get("user-agent")));
  return new NextResponse(null, { status: 204 });
}
