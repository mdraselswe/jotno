import {
  BellRing,
  CircleCheck,
  KeyRound,
  MessageCircleQuestion,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { Suspense } from "react";
import { OwnerScene } from "@/components/illustrations/join-scenes";
import { ROUTES } from "@/config/routes";
import { LoginForm, LoginFormSkeleton } from "@/features/auth";
import type { MessageKey } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return {
    ...pageMetadata(t("auth.title"), t("auth.sub"), ROUTES.login, await getLocale()),
    robots: { index: false },
  };
}

const BENEFITS: readonly [LucideIcon, MessageKey][] = [
  [Stethoscope, "ownerui.login.benefit1"],
  [MessageCircleQuestion, "ownerui.login.benefit2"],
  [BellRing, "ownerui.login.benefit3"],
  [KeyRound, "ownerui.login.benefit4"],
];

export default async function LoginPage() {
  const t = await getT();
  return (
    <div className="container-page grid gap-6 py-6 md:py-10 lg:min-h-[calc(100svh-10rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-12">
      {/* Brand panel: desktop only */}
      <section className="relative grid gap-8 overflow-hidden rounded-(--radius-3xl) bg-primary p-10 text-primary-foreground shadow-(--shadow-card) max-lg:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-highlight/30 blur-3xl"
        />
        <h2 className="relative max-w-md font-heading text-4xl leading-tight font-bold tracking-tight text-balance">
          {t("ownerui.login.brandTitle")}
        </h2>
        <ul className="relative grid gap-3">
          {BENEFITS.map(([Icon, key]) => (
            <li key={key} className="flex items-center gap-3 text-base font-medium">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-foreground/15">
                <Icon aria-hidden="true" className="size-4.5" />
              </span>
              {t(key)}
            </li>
          ))}
        </ul>
        <OwnerScene className="relative mx-auto max-w-sm" />
      </section>

      <div className="grid gap-5">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
        {/* Phones and tablets: the same promises, compact, under the form */}
        <ul className="mx-auto grid w-full max-w-md grid-cols-2 gap-2 lg:hidden">
          {BENEFITS.map(([, key]) => (
            <li
              key={key}
              className="flex items-start gap-2 rounded-(--radius-xl) bg-card/70 p-3 text-xs font-medium ring-1 ring-foreground/6"
            >
              <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
