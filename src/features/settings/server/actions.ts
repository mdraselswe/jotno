"use server";

import { revalidatePath } from "next/cache";
import { actionViewer } from "@/features/auth/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit } from "@/infrastructure/db/helpers";
import { settingsSchema, type Settings } from "../model";
import { SETTINGS_KEY } from "./queries";

export type SettingsResult = { ok: true } | { ok: false; error: MessageKey };

/** Admin: save the business settings. */
export async function saveSettings(input: Settings): Promise<SettingsResult> {
  const me = await actionViewer(["admin"]);
  if (!me) return { ok: false, error: "common.notAllowed" };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "settingsAdmin.invalid" };
  await db()
    .insert(schema.settings)
    .values({ key: SETTINGS_KEY, value: parsed.data, updatedBy: me.id })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: parsed.data, updatedBy: me.id, updatedAt: new Date() },
    });
  await audit(me.id, "settings.update", "settings", null);
  revalidatePath("/", "layout");
  return { ok: true };
}
