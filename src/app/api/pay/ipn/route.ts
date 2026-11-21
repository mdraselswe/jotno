import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/config/locale";
import { settlePayment } from "@/features/payments/server";

/** Server-to-server notice from the gateway (works even if the browser never comes back). */
export async function POST(request: NextRequest) {
  const fields: Record<string, string> = {};
  const form = await request.formData().catch(() => null);
  form?.forEach((value, key) => {
    if (typeof value === "string") fields[key] = value;
  });
  const result = await settlePayment(fields, DEFAULT_LOCALE);
  return NextResponse.json({ ok: result.status !== "unknown" });
}
