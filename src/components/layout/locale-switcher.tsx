"use client";

import { Languages } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LOCALES, localeName, localePath, splitLocale } from "@/config/locale";
import { saveLocale } from "@/features/auth";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Links to the current page in the other languages. Hidden with one language,
 * a single link with two, a menu with more.
 *
 * Never prefetched: another language is another root layout (`app/[locale]`),
 * so the click is a full page load anyway, and the prefetch of a
 * default-language URL (`/vets/`, served through the proxy rewrite to
 * `/bn/vets/`) answered 404 once and logged a console error on every /en page.
 */
export function LocaleSwitcher() {
  return (
    <Suspense fallback={<Switcher path="/" />}>
      <CurrentSwitcher />
    </Suspense>
  );
}

// The current path is request data, so it streams in; the prerendered links point at the home page.
function CurrentSwitcher() {
  return <Switcher path={splitLocale(usePathname()).path} />;
}

/**
 * Remembers the new language on a signed-in person's profile (push messages
 * use it). Fire and forget: the link navigates at once; signed out it's a no-op.
 */
function remember(next: string, current: string) {
  if (next !== current) saveLocale(next).catch(() => undefined);
}

function Switcher({ path }: { path: string }) {
  const locale = useLocale();
  const t = useT();
  const others = LOCALES.filter((l) => l !== locale);
  // The same page under app/[locale] in another language, so the cast is safe.
  const hrefFor = (l: string) => localePath(l, path) as Route;

  const [only] = others;
  if (!only) return null;

  if (others.length === 1) {
    return (
      <Link
        href={hrefFor(only)}
        prefetch={false}
        hrefLang={only}
        lang={only}
        onClick={() => remember(only, locale)}
        aria-label={`${t("locale.switch")}: ${localeName(only)}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
      >
        <Languages aria-hidden="true" />
        {localeName(only)}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("locale.switch")}>
            <Languages aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l}
            render={<Link href={hrefFor(l)} prefetch={false} hrefLang={l} lang={l} />}
            onClick={() => remember(l, locale)}
            aria-current={l === locale ? "true" : undefined}
          >
            {localeName(l)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Every language as one big segmented control (the mobile menu): the current
 * one is marked, each other one links to this same page in that language.
 */
export function LocaleSegment({ onPick, compact = false }: { onPick?: () => void; compact?: boolean }) {
  return (
    <Suspense fallback={<Segment path="/" onPick={onPick} compact={compact} />}>
      <CurrentSegment onPick={onPick} compact={compact} />
    </Suspense>
  );
}

function CurrentSegment({ onPick, compact }: { onPick?: () => void; compact: boolean }) {
  return <Segment path={splitLocale(usePathname()).path} onPick={onPick} compact={compact} />;
}

function Segment({ path, onPick, compact }: { path: string; onPick?: () => void; compact: boolean }) {
  const locale = useLocale();
  const t = useT();
  if (LOCALES.length < 2) return null;
  return (
    <div role="group" aria-label={t("locale.label")} className="grid auto-cols-fr grid-flow-col gap-1">
      {LOCALES.map((l) => {
        const current = l === locale;
        return (
          <Link
            key={l}
            href={localePath(l, path) as Route}
            prefetch={false}
            hrefLang={l}
            lang={l}
            onClick={() => {
              remember(l, locale);
              onPick?.();
            }}
            aria-current={current ? "true" : undefined}
            className={cn(
              "grid place-items-center rounded-(--radius-lg) font-semibold transition-[background-color,color,box-shadow] duration-(--motion-fast)",
              compact ? "h-8 px-3 text-xs" : "h-10 text-sm",
              current
                ? "bg-card text-foreground shadow-(--shadow-control) ring-1 ring-foreground/8"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {localeName(l)}
          </Link>
        );
      })}
    </div>
  );
}
