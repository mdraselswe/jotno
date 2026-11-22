import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/features/auth/server";
import { ordersForExport } from "@/features/shop/server";

/** Admin: orders as CSV for accounting (default the last 31 days; ?from=YYYY-MM-DD&to=YYYY-MM-DD). */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const end = to && day.test(to) ? new Date(`${to}T23:59:59+06:00`) : new Date();
  const start =
    from && day.test(from) ? new Date(`${from}T00:00:00+06:00`) : new Date(end.getTime() - 31 * 86_400_000);
  const rows = await ordersForExport(start, end);

  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // Quote everything; stop spreadsheet formulas from user text.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const taka = (p: number) => (p / 100).toFixed(2);
  const header = [
    "number",
    "created_at",
    "status",
    "payment",
    "name",
    "phone",
    "district_id",
    "address",
    "items",
    "subtotal",
    "discount",
    "coupon",
    "delivery",
    "total",
    "courier",
    "tracking",
  ];
  const lines = rows.map((o) =>
    [
      o.number,
      o.createdAt.toISOString(),
      o.status,
      o.paymentMethod,
      o.name,
      o.phone,
      o.districtId,
      o.address,
      o.items.map((i) => `${i.name} x${i.qty}`).join("; "),
      taka(o.subtotal),
      taka(o.discount),
      o.couponCode,
      taka(o.deliveryFee),
      taka(o.total),
      o.courier,
      o.trackingCode,
    ]
      .map(cell)
      .join(","),
  );
  const body = `﻿${header.join(",")}\n${lines.join("\n")}\n`;
  const name = `jotno-orders-${start.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}.csv`;
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}
