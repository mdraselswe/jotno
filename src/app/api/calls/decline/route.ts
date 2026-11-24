import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config";
import { DEFAULT_LOCALE, isLocale } from "@/config/locale";
import { getViewer } from "@/features/auth/server";
import { endCallAs } from "@/features/consults/server";

/**
 * The "Decline" button on a call notification (public/sw.js). The service worker
 * posts with the person's cookies; only the callee of that call can end it.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(site.url).origin && origin !== request.nextUrl.origin)
    return NextResponse.json({ ok: false }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const { callId, locale } = (body ?? {}) as { callId?: unknown; locale?: unknown };
  if (typeof callId !== "string") return NextResponse.json({ ok: false }, { status: 400 });
  const lang = typeof locale === "string" && isLocale(locale) ? locale : DEFAULT_LOCALE;
  const r = await endCallAs(viewer, lang, callId, "decline");
  return NextResponse.json(r, { status: r.ok ? 200 : 404 });
}
