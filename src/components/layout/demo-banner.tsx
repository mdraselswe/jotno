import { FlaskConical } from "lucide-react";
import { publicEnv } from "@/config/env";
import { getT } from "@/i18n/server";

/** Shown on preview deploys (NEXT_PUBLIC_DEMO): demo vets, pretend payments. */
export async function DemoBanner() {
  if (!publicEnv.NEXT_PUBLIC_DEMO) return null;
  const t = await getT();
  return (
    <div
      data-demo-banner
      className="bg-foreground text-background dark:bg-muted dark:text-foreground print:hidden"
    >
      <p className="container-page flex items-center justify-center gap-2 py-1.5 text-center text-xs font-medium">
        <FlaskConical aria-hidden="true" className="size-3.5 shrink-0" />
        {t("demo.banner")}
      </p>
    </div>
  );
}
