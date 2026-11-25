import "server-only";
import type { Metadata } from "next";
import type { MessageKey } from "@/i18n";
import { getT } from "@/i18n/server";

/**
 * The tab title of an admin page in the reader's language ("Admin · Vets",
 * "অ্যাডমিন · ভেট"), never indexed. Without a page it is just "Admin".
 */
export async function adminMetadata(page?: MessageKey): Promise<Metadata> {
  const t = await getT();
  return {
    title: page ? t("adminui.meta.title", { page: t(page) }) : t("admin.title"),
    robots: { index: false },
  };
}
