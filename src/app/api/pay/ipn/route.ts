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
  // Anyone can POST here. Without a val_id there is nothing to check with the
  // gateway, so don't let an unverified notice cancel a payment; the unpaid
  // hold still expires on its own.
  if (!fields.val_id) return NextResponse.json({ ok: false });
  const result = await settlePayment(fields, DEFAULT_LOCALE);
  return NextResponse.json({ ok: result.status !== "unknown" });
}
