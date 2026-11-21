import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/config/locale";
import { afterPaymentPath, settlePayment } from "@/features/payments/server";

/**
 * The gateway sends the browser back here (POST form for SSLCommerz, GET for
 * some wallets). We verify with the gateway's API, settle once, then redirect
 * with 303 so the browser does a plain GET of the result page.
 */
async function handle(request: NextRequest) {
  const url = request.nextUrl;
  const fields: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    fields[key] = value;
  });
  if (request.method === "POST") {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("form")) {
      const form = await request.formData();
      form.forEach((value, key) => {
        if (typeof value === "string") fields[key] = value;
      });
    }
  }
  const localeParam = fields.locale ?? DEFAULT_LOCALE;
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const result = await settlePayment(fields, locale);
  return NextResponse.redirect(new URL(afterPaymentPath(result, locale), url.origin), 303);
}

export const GET = handle;
export const POST = handle;
