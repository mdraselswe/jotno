import { getT } from "@/i18n/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MockCheckout } from "@/features/payments";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("pay.title"), robots: { index: false } };
}

export default function MockPayPage() {
  return (
    <div className="container-page grid min-h-[70svh] place-items-center py-10">
      <Suspense fallback={<Skeleton role="status" className="h-96 w-full max-w-sm rounded-(--radius-2xl)" />}>
        <MockCheckout />
      </Suspense>
    </div>
  );
}
