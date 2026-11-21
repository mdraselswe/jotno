import "server-only";
import { redirect } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { requireRole, type Viewer } from "@/features/auth/server";
import { localeHref } from "@/lib/locale-href";
import { ensureDraftProvider, getMyProvider, type MyProvider } from "./queries";

/** A dashboard page: signed-in vet (or admin with a vet profile) and their provider row. */
export async function requireVet(
  locale: string,
  next: string,
): Promise<{ viewer: Viewer; provider: MyProvider }> {
  const viewer = await requireRole(["vet"], locale, next);
  let provider = await getMyProvider(viewer.id);
  if (!provider) {
    if (viewer.role !== "vet") redirect(localeHref(locale, ROUTES.admin));
    await ensureDraftProvider(viewer.id, viewer.fullName ?? "Vet", viewer.homeDistrictId, viewer.homeAreaId);
    provider = await getMyProvider(viewer.id);
    if (!provider) redirect(localeHref(locale, ROUTES.home));
  }
  return { viewer, provider };
}
