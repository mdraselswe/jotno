"use client";

import { lazy, Suspense } from "react";
import { useAuthUser } from "@/features/auth/components/use-auth-user";

// Loaded only for a signed-in person, so visitors' pages don't carry the call UI.
const IncomingCall = lazy(() => import("./call/incoming-call").then((m) => ({ default: m.IncomingCall })));
const VetWaitingAlert = lazy(() =>
  import("./vet-waiting-alert").then((m) => ({ default: m.VetWaitingAlert })),
);

/** On every page: incoming calls, and for vets, chats waiting for a first reply. */
export function SignedInAlerts() {
  const user = useAuthUser();
  if (!user) return null;
  return (
    <Suspense fallback={null}>
      <IncomingCall />
      {user.role === "vet" ? <VetWaitingAlert /> : null}
    </Suspense>
  );
}
