import { Suspense } from "react";
import { MockCheckout } from "@/features/payments";

export const metadata = { title: "Checkout", robots: { index: false } };

export default function MockPayPage() {
  return (
    <div className="container-page grid min-h-[70svh] place-items-center py-12">
      <Suspense>
        <MockCheckout />
      </Suspense>
    </div>
  );
}
