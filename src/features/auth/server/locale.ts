"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { site } from "@/config";
import { db, schema } from "@/infrastructure/db";
import { getViewer } from "./session";

const localeSchema = z.string().refine((l) => site.i18n.locales.includes(l));

/**
 * Remembers the language someone switched to on their profile (push messages
 * and emails use it). Does nothing when signed out, unknown or unchanged.
 */
export async function saveLocale(locale: string): Promise<void> {
  const parsed = localeSchema.safeParse(locale);
  if (!parsed.success) return;
  const viewer = await getViewer();
  if (!viewer || viewer.locale === parsed.data) return;
  await db().update(schema.profiles).set({ locale: parsed.data }).where(eq(schema.profiles.id, viewer.id));
}
