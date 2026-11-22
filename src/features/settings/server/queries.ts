import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/infrastructure/db";
import { readSettings, type Settings } from "../model";

export const SETTINGS_KEY = "business";

/** Business settings for this request (one read, merged over the defaults). */
export const getSettings = cache(async (): Promise<Settings> => {
  const [row] = await db()
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, SETTINGS_KEY))
    .limit(1);
  return readSettings(row?.value);
});
