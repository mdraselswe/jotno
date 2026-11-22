import "server-only";
import { ROUTES } from "@/config/routes";
import { notifyAdmins } from "@/features/notifications/server";
import { lowStockProducts } from "./queries";

/** Once a day: tell the team which products are running out. */
export async function notifyLowStock(): Promise<{ low: number }> {
  const low = await lowStockProducts();
  if (low.length > 0) {
    const names = low
      .slice(0, 5)
      .map((p) => `${p.nameEn} (${p.stock})`)
      .join(", ");
    await notifyAdmins("shop.low_stock", {
      title: `${low.length} product${low.length === 1 ? "" : "s"} running low`,
      body: names,
      url: ROUTES.adminProducts,
      tag: "low-stock",
    });
  }
  return { low: low.length };
}
